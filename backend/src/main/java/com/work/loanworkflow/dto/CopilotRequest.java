package com.work.loanworkflow.dto;

import java.util.List;

/**
 * Request body for the borrower copilot chat endpoint.
 * Carries the full conversation so far; the last message must have role "user".
 */
public class CopilotRequest {
    private List<ChatMessage> messages;

    public CopilotRequest() {}

    public List<ChatMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<ChatMessage> messages) {
        this.messages = messages;
    }
}
