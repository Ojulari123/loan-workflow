package com.work.loanworkflow.dto;

/**
 * A single turn in the borrower copilot conversation.
 * {@code role} is either "user" or "assistant"; {@code content} is the plain-text message.
 */
public class ChatMessage {
    private String role;
    private String content;

    public ChatMessage() {}

    public ChatMessage(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
