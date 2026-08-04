package com.work.loanworkflow.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.TextBlock;

import com.work.loanworkflow.config.ApiKeyResolver;
import com.work.loanworkflow.dto.ChatMessage;
import com.work.loanworkflow.exception.AiUnavailableException;
import com.work.loanworkflow.exception.LoanException;
import com.work.loanworkflow.model.Applicant;
import com.work.loanworkflow.model.Loan;
import com.work.loanworkflow.model.LoanApplication;
import com.work.loanworkflow.model.LoanPayment;

/**
 * Borrower AI copilot powered by Claude Sonnet 5 via the official Anthropic Java SDK.
 *
 * <p>Runs a grounded conversation: a customer asks about their own loan and Claude answers
 * using their real applicant profile, applications, loans, and payment history. The reply is
 * plain text and is <strong>informational only</strong> &mdash; not binding financial advice.</p>
 *
 * <p>Fails gracefully: if {@code ANTHROPIC_API_KEY} is unset or the API call throws, an
 * {@link AiUnavailableException} is raised (mapped to HTTP 502 by the controller) instead of
 * crashing the app. The API key is never logged or echoed.</p>
 */
public class CopilotService {

    private static final String MODEL = "claude-sonnet-5";

    private final LoanService loanService;

    public CopilotService() {
        this.loanService = new LoanService();
    }

    public CopilotService(LoanService loanService) {
        this.loanService = loanService;
    }

    /**
     * Answer the latest borrower question using their real loan data.
     *
     * @param applicantId the borrower asking
     * @param messages    the conversation so far ("user"/"assistant" turns), last must be "user"
     * @return the concatenated text of Claude's reply
     * @throws LoanException          if the applicant cannot be found
     * @throws AiUnavailableException if the API key is missing or the model call fails
     */
    public String chat(int applicantId, List<ChatMessage> messages) {
        Applicant applicant = loanService.getApplicantById(applicantId);
        if (applicant == null) {
            throw new LoanException("Applicant not found with ID: " + applicantId);
        }

        // These loaders throw LoanException when empty; treat "empty" as no data (new borrower).
        List<LoanApplication> applications = safeApplications(applicantId);
        List<Loan> loans = safeLoans(applicantId);
        List<LoanPayment> payments = safePayments(applicantId);

        // Resolve the key from the process env var or backend/.env. Never reference the value itself.
        String apiKey = ApiKeyResolver.resolveAnthropicKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiUnavailableException("ANTHROPIC_API_KEY is not set (checked environment and backend/.env)");
        }

        String systemPrompt = buildSystemPrompt(applicant, applications, loans, payments);

        AnthropicClient client = null;
        try {
            client = AnthropicOkHttpClient.builder()
                    .apiKey(apiKey)   // use the resolved key (env var or backend/.env)
                    .build();

            MessageCreateParams.Builder builder = MessageCreateParams.builder()
                    .model(MODEL)          // String overload -> exact model id
                    .maxTokens(4000L)
                    .system(systemPrompt);

            // Map the conversation history onto the SDK, alternating roles.
            // Do NOT set temperature/top_p/top_k/budget_tokens (they 400 on Sonnet 5).
            for (ChatMessage m : messages) {
                String content = m.getContent() != null ? m.getContent() : "";
                if ("assistant".equalsIgnoreCase(m.getRole())) {
                    builder.addAssistantMessage(content);
                } else {
                    builder.addUserMessage(content);
                }
            }

            return client.messages().create(builder.build()).content().stream()
                    .flatMap(cb -> cb.text().stream())
                    .map(TextBlock::text)
                    .collect(Collectors.joining());
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

    private String buildSystemPrompt(Applicant applicant, List<LoanApplication> applications,
                                     List<Loan> loans, List<LoanPayment> payments) {
        double annualIncome = applicant.getAnnualIncome();
        double monthlyDebt = applicant.getMonthlyDebt();
        double annualDebt = monthlyDebt * 12.0;
        double dti = annualIncome > 0 ? (annualDebt / annualIncome) * 100.0 : 0.0; // guard divide-by-zero
        String employment = applicant.getEmploymentStatus() != null
                ? applicant.getEmploymentStatus() : "Unknown";

        StringBuilder sb = new StringBuilder();
        sb.append("You are Northline Capital's helpful, honest borrower assistant. ");
        sb.append("You are chatting directly with the borrower named below about their own loan(s). ");
        sb.append("Everything in the BORROWER DATA section is this specific borrower's real, up-to-date information; ");
        sb.append("ground every answer in these actual numbers rather than generic examples.\n\n");

        sb.append("HOW TO HELP\n");
        sb.append("- Answer clearly and concisely, using THEIR real numbers.\n");
        sb.append("- Do the math when asked (e.g. \"what if I pay $200 extra a month?\", \"how long until I'm paid off?\"). ");
        sb.append("Show the key steps briefly so they can follow along.\n");
        sb.append("- Be honest about affordability: compare payments against their income, existing monthly debt, and account balance.\n");
        sb.append("- Give general, informational help only. You do NOT give binding financial or legal advice, and you never change their loan or take actions on the account.\n");
        sb.append("- If they have no loan yet, help them understand their options and what they might qualify for under the product rules below.\n\n");

        sb.append("PRODUCT RULES (Northline Capital)\n");
        sb.append("- Interest is tiered by loan size: up to $10,000 -> 2.5%, up to $50,000 -> 5%, above $50,000 -> 7.5%.\n");
        sb.append("- Interest is fixed at approval and NEVER compounds. It is added once, up front, to form the total balance owed.\n");
        sb.append("- Repayment reduces the outstanding balance directly, dollar for dollar. There is no separate accruing interest.\n\n");

        sb.append("BORROWER DATA\n");
        sb.append("Profile:\n");
        sb.append("- Name: ").append(applicant.getName()).append('\n');
        sb.append("- Email: ").append(applicant.getEmail()).append('\n');
        sb.append("- Employment status: ").append(employment).append('\n');
        sb.append("- Annual income: ").append(fmtMoney(applicant.getAnnualIncome())).append('\n');
        sb.append("- Monthly debt payments: ").append(fmtMoney(applicant.getMonthlyDebt())).append('\n');
        sb.append("- Account balance (available funds): ").append(fmtMoney(applicant.getAccountBalance())).append('\n');
        sb.append("- Total approved loan amount on record: ").append(fmtMoney(applicant.getApprovedLoanAmount())).append('\n');
        sb.append("- Estimated debt-to-income ratio: ").append(String.format("%.2f", dti)).append("%\n\n");

        sb.append("Loan applications:\n");
        if (applications.isEmpty()) {
            sb.append("- None on record yet.\n");
        } else {
            for (LoanApplication a : applications) {
                String purpose = a.getLoanPurpose() != null ? a.getLoanPurpose() : "Unspecified";
                sb.append("- Application #").append(a.getApplicationId())
                        .append(": requested ").append(fmtMoney(a.getAmountRequested()))
                        .append(", approved ").append(fmtMoney(a.getApprovedAmount()))
                        .append(" (this already includes interest at the ")
                        .append(fmtRate(a.getAmountRequested()))
                        .append(" tier for the requested amount)")
                        .append(", remaining balance ").append(fmtMoney(a.getRemainingBalance()))
                        .append(", status ").append(a.getStatus() != null ? a.getStatus() : "UNKNOWN")
                        .append(", fully paid: ").append(a.isFullyPaid())
                        .append(", purpose: ").append(purpose)
                        .append('\n');
            }
        }
        sb.append('\n');

        sb.append("Disbursed loans:\n");
        if (loans.isEmpty()) {
            sb.append("- None on record yet.\n");
        } else {
            for (Loan l : loans) {
                sb.append("- Loan #").append(l.getId())
                        .append(" (from application #").append(l.getLoanApplicationId()).append(")")
                        .append(": amount ").append(fmtMoney(l.getLoanAmount()))
                        .append(", status ").append(l.getStatus() != null ? l.getStatus() : "UNKNOWN")
                        .append('\n');
            }
        }
        sb.append('\n');

        sb.append("Recent payments (most recent last):\n");
        if (payments.isEmpty()) {
            sb.append("- None on record yet.\n");
        } else {
            // Keep the prompt focused: show at most the 10 most recent payments.
            int start = Math.max(0, payments.size() - 10);
            for (int i = start; i < payments.size(); i++) {
                LoanPayment p = payments.get(i);
                sb.append("- Loan #").append(p.getLoanId())
                        .append(": paid ").append(fmtMoney(p.getAmountPaid()))
                        .append(", remaining balance after ").append(fmtMoney(p.getRemainingBalance()))
                        .append(" on ").append(p.getPaidAt() != null ? p.getPaidAt() : "unknown date")
                        .append('\n');
            }
        }

        return sb.toString();
    }

    private List<LoanApplication> safeApplications(int applicantId) {
        try {
            return loanService.getApplicationsByApplicant(applicantId);
        } catch (LoanException e) {
            return new ArrayList<>();
        }
    }

    private List<Loan> safeLoans(int applicantId) {
        try {
            return loanService.getLoansByApplicant(applicantId);
        } catch (LoanException e) {
            return new ArrayList<>();
        }
    }

    private List<LoanPayment> safePayments(int applicantId) {
        try {
            return loanService.getPaymentsByApplicant(applicantId);
        } catch (LoanException e) {
            return new ArrayList<>();
        }
    }

    private String fmtMoney(double value) {
        return "$" + String.format("%,.2f", value);
    }

    /** The applicable interest tier for a given principal, per the product rules. */
    private String fmtRate(double amount) {
        if (amount <= 10000) {
            return "2.5%";
        } else if (amount <= 50000) {
            return "5%";
        } else {
            return "7.5%";
        }
    }

    private String sanitize(Exception e) {
        String reason = e.getMessage();
        if (reason == null || reason.isBlank()) {
            reason = e.getClass().getSimpleName();
        }
        return reason;
    }
}
