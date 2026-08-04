package com.work.loanworkflow.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessageCreateParams;

import com.work.loanworkflow.config.ApiKeyResolver;
import com.work.loanworkflow.exception.AiUnavailableException;
import com.work.loanworkflow.exception.LoanException;
import com.work.loanworkflow.model.Applicant;
import com.work.loanworkflow.model.CreditAssessment;
import com.work.loanworkflow.model.LoanApplication;

import java.util.List;

/**
 * AI Underwriter powered by Claude Sonnet 5 via the official Anthropic Java SDK.
 *
 * <p>Takes a loan application plus the applicant's financial profile and returns a
 * structured, explainable {@link CreditAssessment}. It is <strong>advisory only</strong>:
 * it never changes the loan status; staff still decide.</p>
 *
 * <p>Fails gracefully: if {@code ANTHROPIC_API_KEY} is unset or the API call throws,
 * an {@link AiUnavailableException} is raised (mapped to HTTP 502 by the controller)
 * instead of crashing the app. The API key is never logged or echoed.</p>
 */
public class AiUnderwritingService {

    private static final String MODEL = "claude-sonnet-5";

    private static final String SYSTEM_PROMPT =
            "You are a careful, fair consumer-lending underwriter. Given an applicant's financial "
            + "profile and a requested loan, produce a structured, explainable credit assessment. "
            + "Be objective and evidence-based; do not discriminate on protected characteristics. "
            + "Use recommendation APPROVE for low-risk applicants, DECLINE for clearly unaffordable or "
            + "high-risk ones, and REFER when a human should take a closer look. Base the risk score "
            + "(0-100, higher is safer) on debt-to-income ratio, income, existing approved debt, "
            + "account balance/reserves, employment status, and the requested amount versus capacity. "
            + "For the recommended interest rate, start from the product tiers "
            + "(<=10k -> 2.5%, <=50k -> 5%, >50k -> 7.5%) and adjust modestly for risk. "
            + "The recommended amount must not exceed the amount requested. "
            + "Write a specific, complete assessment grounded in this applicant's actual figures. "
            + "The rationale must be 2 to 4 full sentences that cite this applicant's income, debts, "
            + "reserves, and requested amount. Provide 4 to 6 distinct key factors, and for each give "
            + "its name, its impact (POSITIVE, NEGATIVE, or NEUTRAL), and a concrete one-sentence "
            + "explanation tied to the numbers. Finish with a one-sentence summary. Every part of the "
            + "assessment must contain real, applicant-specific analysis drawn from the figures above. "
            + "This assessment is advisory only and does not itself approve or decline the loan.";

    private final LoanService loanService;

    public AiUnderwritingService() {
        this.loanService = new LoanService();
    }

    public AiUnderwritingService(LoanService loanService) {
        this.loanService = loanService;
    }

    /**
     * Produce an AI credit assessment for the given loan application.
     *
     * @throws LoanException          if the application or applicant cannot be found
     * @throws AiUnavailableException if the API key is missing or the model call fails
     */
    public CreditAssessment assess(int applicationId) {
        // Load the application (throws LoanException if not found) and its applicant.
        LoanApplication application = loanService.getLoanApplicationById(applicationId);
        Applicant applicant = loanService.getApplicantById(application.getApplicantId());
        if (applicant == null) {
            throw new LoanException("Applicant not found for application ID: " + applicationId);
        }

        // Resolve the key from the process env var or backend/.env. Never reference the value itself.
        String apiKey = ApiKeyResolver.resolveAnthropicKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiUnavailableException("ANTHROPIC_API_KEY is not set (checked environment and backend/.env)");
        }

        double annualIncome = applicant.getAnnualIncome();
        double monthlyDebt = applicant.getMonthlyDebt();
        double annualDebt = monthlyDebt * 12.0;
        double dti = annualIncome > 0 ? (annualDebt / annualIncome) * 100.0 : 0.0; // guard divide-by-zero

        String profile = buildProfile(application, applicant, dti);

        AnthropicClient client = null;
        try {
            client = AnthropicOkHttpClient.builder()
                    .apiKey(apiKey)   // use the resolved key (env var or backend/.env)
                    .build();

            StructuredMessageCreateParams<CreditAssessment> params = MessageCreateParams.builder()
                    .model(MODEL)                          // String overload -> exact model id
                    .maxTokens(16000L)
                    // Thinking OFF for this structured call: with adaptive thinking on, Sonnet 5
                    // reasons in the hidden thinking block and then intermittently stubs the text
                    // fields with "placeholder". Disabling it forces real content into the JSON.
                    .thinking(com.anthropic.models.messages.ThinkingConfigDisabled.builder().build())
                    .outputConfig(CreditAssessment.class)  // typed structured output
                    .system(SYSTEM_PROMPT)
                    .addUserMessage(profile)
                    .build();

            CreditAssessment first = callModel(client, params);
            if (!isDegenerate(first)) {
                return first;
            }
            // Degenerate first result: retry exactly once with the same params (bounds cost).
            CreditAssessment second = callModel(client, params);
            if (!isDegenerate(second)) {
                return second;
            }
            // Both degenerate: keep whichever has the longer rationale; do not throw.
            return longerRationale(first, second);
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            // Never leak the key; surface only a sanitized reason.
            throw new AiUnavailableException(sanitize(e));
        } finally {
            if (client != null) {
                try {
                    client.close();
                } catch (Exception ignored) {
                    // closing failures must not mask the real result
                }
            }
        }
    }

    /** Invoke the model once and extract the typed structured output. */
    private CreditAssessment callModel(AnthropicClient client,
                                       StructuredMessageCreateParams<CreditAssessment> params) {
        return client.messages().create(params).content().stream()
                .flatMap(cb -> cb.text().stream())
                .findFirst()
                .orElseThrow(() -> new AiUnavailableException("model returned no structured content"))
                .text();
    }

    /**
     * True when the assessment lacks usable content: a too-short/missing rationale,
     * fewer than two key factors, or any factor missing its detail.
     */
    private boolean isDegenerate(CreditAssessment assessment) {
        if (assessment == null) {
            return true;
        }
        String rationale = assessment.rationale();
        if (rationale == null || rationale.trim().length() < 20) {
            return true;
        }
        List<CreditAssessment.Factor> factors = assessment.keyFactors();
        if (factors == null || factors.size() < 2) {
            return true;
        }
        for (CreditAssessment.Factor f : factors) {
            if (f == null || f.detail() == null || f.detail().isBlank()) {
                return true;
            }
        }
        return false;
    }

    /** Of two assessments, return the one with the longer rationale (ties favor the first). */
    private CreditAssessment longerRationale(CreditAssessment a, CreditAssessment b) {
        int la = (a != null && a.rationale() != null) ? a.rationale().trim().length() : -1;
        int lb = (b != null && b.rationale() != null) ? b.rationale().trim().length() : -1;
        return lb > la ? b : a;
    }

    private String buildProfile(LoanApplication application, Applicant applicant, double dti) {
        String employment = applicant.getEmploymentStatus() != null
                ? applicant.getEmploymentStatus() : "Unknown";
        String purpose = application.getLoanPurpose() != null
                ? application.getLoanPurpose() : "Unspecified";

        StringBuilder sb = new StringBuilder();
        sb.append("Please underwrite the following consumer loan application.\n\n");
        sb.append("APPLICANT PROFILE\n");
        sb.append("- Name: ").append(applicant.getName()).append('\n');
        sb.append("- Employment status: ").append(employment).append('\n');
        sb.append("- Annual income: ").append(fmtMoney(applicant.getAnnualIncome())).append('\n');
        sb.append("- Monthly debt payments: ").append(fmtMoney(applicant.getMonthlyDebt())).append('\n');
        sb.append("- Account balance (reserves): ").append(fmtMoney(applicant.getAccountBalance())).append('\n');
        sb.append("- Existing approved loan amount: ").append(fmtMoney(applicant.getApprovedLoanAmount())).append('\n');
        sb.append("- Estimated debt-to-income ratio: ").append(String.format("%.2f", dti)).append("%\n\n");
        sb.append("LOAN REQUEST\n");
        sb.append("- Application ID: ").append(application.getApplicationId()).append('\n');
        sb.append("- Amount requested: ").append(fmtMoney(application.getAmountRequested())).append('\n');
        sb.append("- Purpose: ").append(purpose).append('\n');
        sb.append("- Current status (do not change; advisory only): ").append(application.getStatus()).append('\n');
        sb.append('\n');
        sb.append("Now produce the full structured assessment for this applicant. Fill every field with "
                + "concrete, figure-based analysis: a 2 to 4 sentence rationale that references the numbers "
                + "above, 4 to 6 distinct key factors each with its own one-sentence explanation and an "
                + "impact label, and a one-sentence summary. Name each key factor explicitly, such as "
                + "employment status, debt-to-income ratio, income adequacy, account reserves, existing "
                + "approved debt, and requested amount versus repayment capacity.\n");
        return sb.toString();
    }

    private String fmtMoney(double value) {
        return String.format("%,.2f", value);
    }

    private String sanitize(Exception e) {
        String reason = e.getMessage();
        if (reason == null || reason.isBlank()) {
            reason = e.getClass().getSimpleName();
        }
        return reason;
    }
}
