import { useState } from "react";
import { TextField, Box, Button } from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { useNavigate } from 'react-router-dom';

interface CredentialType {
    email: string;
    password: string;
}

export default function Login() {
    const [credential, setCredential] = useState<CredentialType>({ email: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredential({ ...credential, [e.target.name]: e.target.value });
    };

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, credential.email, credential.password);
            alert("Login successful!");
            navigate("/");
        } catch (err) {
            setError("Failed to log in. Check your credentials.");
        }
    };

    return (

        <Box
            component="form"
            sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}
            noValidate
            autoComplete="off"
        >
            <div>
                <TextField
                    id="email"
                    label="Email"
                    variant="outlined"
                    name="email"
                    value={credential.email}
                    onChange={handleChange}
                />
            </div>
            <div>
                <TextField
                    id="password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    name="password"
                    value={credential.password}
                    onChange={handleChange}
                />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div>
                <Button variant="contained" onClick={handleLogin}>Login</Button>
            </div>
        </Box>

    );
}
