package com.work.loanworkflow.model;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import java.util.List;

/**
 * Structured, explainable credit assessment produced by the AI underwriter
 * (Claude Sonnet 5). Advisory only: it does NOT change the loan status.
 *
 * <p>Used directly as the structured-output schema passed to the Anthropic
 * Java SDK ({@code outputConfig(CreditAssessment.class)}). The
 * {@link JsonPropertyDescription} annotations are surfaced to the model as
 * JSON-schema field descriptions to improve output quality.</p>
 */
public record CreditAssessment(

        @JsonPropertyDescription("Overall creditworthiness score from 0 to 100, where higher means safer/lower risk.")
        int riskScore,

        @JsonPropertyDescription("Underwriting recommendation. Exactly one of: APPROVE, REFER, DECLINE.")
        String recommendation,

        @JsonPropertyDescription("Suggested approved loan principal in the same currency as the amount requested.")
        double recommendedAmount,

        @JsonPropertyDescription("Suggested risk-based annual interest rate as a percentage (e.g. 5.0 for 5%). "
                + "Product reference tiers: <=10k -> 2.5%, <=50k -> 5%, >50k -> 7.5%; adjust for risk.")
        double recommendedRate,

        @JsonPropertyDescription("Estimated debt-to-income ratio as a percentage (annual debt divided by annual income * 100).")
        double debtToIncomeRatio,

        @JsonPropertyDescription("Key factors that drove the decision, each with a POSITIVE, NEGATIVE or NEUTRAL impact.")
        List<Factor> keyFactors,

        @JsonPropertyDescription("Short list of specific red flags or concerns. Empty when there are none.")
        List<String> redFlags,

        @JsonPropertyDescription("A few sentences of plain-language reasoning explaining the recommendation.")
        String rationale,

        @JsonPropertyDescription("A single-line summary of the assessment.")
        String summary
) {

    /**
     * A single explainable factor contributing to the assessment.
     */
    public record Factor(

            @JsonPropertyDescription("Name of the factor, e.g. 'Debt-to-income ratio' or 'Employment status'.")
            String factor,

            @JsonPropertyDescription("Direction of influence on the decision. Exactly one of: POSITIVE, NEGATIVE, NEUTRAL.")
            String impact,

            @JsonPropertyDescription("Short explanation of why this factor matters for this applicant.")
            String detail
    ) {
    }
}
