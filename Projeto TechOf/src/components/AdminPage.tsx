import React, { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { auth } from "../config/firebase";
import { FirebaseError } from "firebase/app";
import { useNavigate } from "react-router-dom";
import {
    Typography,
    Button,
    TextField,
    IconButton,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress,
    Snackbar,
    Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { makeStyles } from "@mui/styles";

// Styles
const useStyles = makeStyles({
    root: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "20px",
    },
    card: {
        width: "45%",
        margin: "10px",
        overflow: "auto",
    },
    cardContent: {
        maxHeight: "400px",
        overflowY: "auto",
    },
    loading: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
    },
    userActions: {
        display: "flex",
        gap: "8px", // Add spacing between buttons
    },
    subtleButton: {
        textTransform: "none", // Prevent uppercase text
        fontSize: "0.875rem", // Smaller font size
        padding: "4px 8px", // Smaller padding
        backgroundColor: "transparent", // No background color
        color: "#1976d2", // Subtle blue color
        border: "1px solid #1976d2", // Subtle border
        "&:hover": {
            backgroundColor: "rgba(25, 118, 210, 0.04)", // Light hover effect
        },
    },
    deleteButton: {
        textTransform: "none",
        fontSize: "0.875rem",
        padding: "4px 8px",
        backgroundColor: "transparent",
        color: "#d32f2f", // Subtle red color
        border: "1px solid #d32f2f", // Subtle border
        "&:hover": {
            backgroundColor: "rgba(211, 47, 47, 0.04)", // Light hover effect
        },
    },
});

const AdminPage: React.FC = () => {
    const [flats, setFlats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [editFlatModalOpen, setEditFlatModalOpen] = useState<boolean>(false);
    const [flatToEdit, setFlatToEdit] = useState<any>(null);
    const [deletePassword, setDeletePassword] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const navigate = useNavigate();
    const classes = useStyles();

    // Fetch flats and users data
    const fetchData = async () => {
        try {
            const flatsCollection = collection(db, "flats");
            const flatsSnapshot = await getDocs(flatsCollection);
            const flatsList = flatsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setFlats(flatsList);

            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setUsers(usersList);
        } catch (err) {
            setError("Error fetching data");
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const userRef = doc(db, "users", currentUser.uid);
                    const userDoc = await getDoc(userRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData?.isAdmin) {
                            setIsAdmin(true);
                            fetchData();
                        } else {
                            navigate("/");
                        }
                    } else {
                        navigate("/login");
                    }
                } catch (err) {
                    navigate("/login");
                }
            } else {
                navigate("/login");
            }
        });

        return () => unsubscribe();
    }, []);

    const handleDeleteFlat = async (flatId: string) => {
        try {
            const flatRef = doc(db, "flats", flatId);
            await deleteDoc(flatRef);
            setFlats(flats.filter((flat) => flat.id !== flatId));
        } catch (err) {
            setError("Failed to delete flat");
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete || !auth.currentUser || !auth.currentUser.email) return;

        setIsProcessing(true);

        try {
            // Reauthenticate the currently logged-in admin
            const credential = EmailAuthProvider.credential(auth.currentUser.email, deletePassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // Delete the user from Firestore
            await deleteDoc(doc(db, "users", userToDelete.id));

            // If the user being deleted is the currently logged-in admin, delete their auth account and log them out
            if (auth.currentUser.uid === userToDelete.id) {
                await deleteUser(auth.currentUser);
                setNotification({ message: "Your account has been deleted successfully.", severity: 'success' });
                setTimeout(() => navigate("/"), 2000); // Redirect after 2 seconds
            } else {
                // If it's another user, just delete their Firestore record
                setNotification({ message: "User deleted successfully.", severity: 'success' });
                setUserToDelete(null); // Close the delete modal
                fetchData(); // Refresh the users list
            }
        } catch (err) {
            let errorMessage = "Failed to delete account";
            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case "auth/wrong-password":
                        errorMessage = "Incorrect password.";
                        break;
                    case "auth/requires-recent-login":
                        errorMessage = "Session expired. Please log in again.";
                        break;
                    default:
                        errorMessage = err.message;
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setNotification({ message: errorMessage, severity: 'error' });
            setDeletePassword("");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { isAdmin: !isAdmin });
            setNotification({ message: `Admin permissions ${isAdmin ? "revoked" : "granted"} successfully.`, severity: 'success' });
            fetchData(); // Refresh the users list
            navigate("/"); // Navigate to the home page
        } catch (err) {
            setNotification({ message: "Failed to update admin permissions.", severity: 'error' });
            console.error("Error updating admin permissions:", err);
        }
    };

    const handleEditFlat = (flatId: string) => {
        const flat = flats.find((flat) => flat.id === flatId);
        setFlatToEdit(flat);
        setEditFlatModalOpen(true);
    };

    const handleSaveFlat = async () => {
        if (flatToEdit) {
            try {
                const flatRef = doc(db, "flats", flatToEdit.id);
                await updateDoc(flatRef, flatToEdit);
                setFlats(flats.map((flat) => (flat.id === flatToEdit.id ? flatToEdit : flat)));
                setEditFlatModalOpen(false);
            } catch (err) {
                setError("Failed to save flat");
            }
        }
    };

    return (
        <div>
            <Typography variant="h4">Admin Panel</Typography>

            {loading ? (
                <div className={classes.loading}>
                    <CircularProgress />
                </div>
            ) : error ? (
                <div>{error}</div>
            ) : (
                <div className={classes.root}>
                    <Card className={classes.card}>
                        <CardContent>
                            <Typography variant="h6">Flats ({flats.length})</Typography>
                            {flats.length === 0 ? (
                                <p>No flats available</p>
                            ) : (
                                flats.map((flat) => (
                                    <div key={flat.id}>
                                        <Typography>{flat.title}</Typography>
                                        <Typography>{flat.price} €</Typography>
                                        <Button
                                            onClick={() => handleEditFlat(flat.id)}
                                            className={classes.subtleButton}
                                        >
                                            Edit
                                        </Button>
                                        <IconButton
                                            onClick={() => handleDeleteFlat(flat.id)}
                                            size="small"
                                            className={classes.deleteButton}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className={classes.card}>
                        <CardContent>
                            <Typography variant="h6">Users</Typography>
                            {users.length === 0 ? (
                                <p>No users available</p>
                            ) : (
                                users.map((user) => (
                                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography>
                                            {user.firstName} {user.lastName} - {user.email}
                                            {user.isAdmin ? " (Admin)" : ""}
                                        </Typography>
                                        <div className={classes.userActions}>
                                            <Button
                                                onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                                                className={classes.subtleButton}
                                            >
                                                {user.isAdmin ? "Revoke Admin" : "Grant Admin"}
                                            </Button>
                                            <Button
                                                onClick={() => setUserToDelete(user)}
                                                className={classes.deleteButton}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Flat Modal */}
            {editFlatModalOpen && (
                <div>
                    <TextField
                        label="Title"
                        value={flatToEdit?.title || ""}
                        onChange={(e) => setFlatToEdit({ ...flatToEdit, title: e.target.value })}
                    />
                    <TextField
                        label="Price"
                        value={flatToEdit?.price || ""}
                        onChange={(e) => setFlatToEdit({ ...flatToEdit, price: e.target.value })}
                    />
                    <Button onClick={handleSaveFlat} className={classes.subtleButton}>
                        Save
                    </Button>
                </div>
            )}

            {/* Delete User Modal */}
            <Dialog open={!!userToDelete} onClose={() => setUserToDelete(null)}>
                <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        This action cannot be undone. All data for this user will be permanently deleted.
                    </Typography>
                    <TextField
                        label="Enter Your Password"
                        type="password"
                        fullWidth
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        margin="normal"
                        disabled={isProcessing}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUserToDelete(null)} className={classes.subtleButton} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteUser}
                        className={classes.deleteButton}
                        disabled={!deletePassword || isProcessing}
                    >
                        {isProcessing ? <CircularProgress size={24} /> : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Notification Snackbar */}
            <Snackbar
                open={!!notification}
                autoHideDuration={6000}
                onClose={() => setNotification(null)}
            >
                <Alert
                    severity={notification?.severity}
                    onClose={() => setNotification(null)}
                    sx={{ width: '100%' }}
                >
                    {notification?.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default AdminPage;