import React, { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import messages from "./messages";
import "./Login.scss";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const success = login(email, password);

    if (success) {
      message.success("Connexion réussie");
      navigate("/");
    } else {
      message.error("Erreur de connexion");
    }
  };

  return (
    <div className="login-container">
      <Card title={messages.title} className="login-card">

        <Input
          placeholder={messages.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input.Password
          placeholder={messages.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginTop: 10 }}
        />

        <Button
          type="primary"
          block
          style={{ marginTop: 15 }}
          onClick={handleLogin}
        >
          {messages.button}
        </Button>

      </Card>
    </div>
  );
};

export default Login;