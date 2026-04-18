-- OAuth state tokens for CSRF protection during social media OAuth flows
CREATE TABLE IF NOT EXISTS oauth_state_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  state_token VARCHAR(128) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  code_verifier VARCHAR(128) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_state (state_token),
  INDEX idx_expires (expires_at)
);
