import db from "../config/firestore";
import { useState, useEffect, useMemo } from "react";
import { collection, addDoc, onSnapshot, query } from "firebase/firestore";

const USERS_COLLECTION_NAME = "users";

function useUsers() {
    const [users, setUsers] = useState([]);



    const usersCollectionRef = collection(db, USERS_COLLECTION_NAME);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            query(usersCollectionRef),
            (querySnapshot) => {
                const items = [];
                querySnapshot.forEach((doc) => {
                    items.push({
                        ...doc.data(),
                        id: doc.id
                    })
                });
                setUsers(items);
            }
        );

        return () => {
            unsubscribe();
        };
    }, []);

    const addUser = async (user) => {
        try {
            await addDoc(usersCollectionRef, user);
        } catch (error) {
            console.error("Failed to add user to users collection", user, error);
        }
    };

    const removeUser = async (user) => {
        try {
            const docRef = doc(db, USERS_COLLECTION_NAME, user.id);
            console.log(`Removing user ${user.id} from collection ${USERS_COLLECTION_NAME}`);
            await deleteDoc(docRef);
            console.log(`Removed user ${user.id} from collection ${USERS_COLLECTION_NAME}`);
        } catch (error) {
            console.error("Failed to add user to users collection", user, error);
        }
    };

    const queryByName = async (name) => {
        try {
            const docRef = doc(db, USERS_COLLECTION_NAME, user.id);
            console.log(`Removing user ${name} from collection ${USERS_COLLECTION_NAME}`);
            const _query = query(usersCollectionRef, where("name", "==", name));
            const querySnapshot = getDocs()

            await deleteDoc(docRef);
            console.log(`Removed user ${name} from collection ${USERS_COLLECTION_NAME}`);
        } catch (error) {
            console.error("Failed to add user to users collection", user, error);
        }
    };

    return {
        users,
        setUsers,
        addUser,
        removeUser
    };
}

export default useUsers;
