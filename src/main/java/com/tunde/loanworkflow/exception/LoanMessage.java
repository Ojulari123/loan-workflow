package com.tunde.loanworkflow.exception;

public class LoanMessage {
    private String message;
    private Object data;

    public LoanMessage(String message) {
        this.message = message;
        this.data = null;
    }

    public LoanMessage(String message, Object data) {
        this.message = message;
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public Object getData() {
        return data;
    }
}