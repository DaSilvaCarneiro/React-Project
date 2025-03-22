import { useEffect, useState } from "react";
import { db } from "../config/firebase";
import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { auth } from "../config/firebase";
import CircularIndeterminate from "../components/Loading";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useFavorites } from '../components/FavoritesContext'; // Import useFavorites
import EditIcon from '@mui/icons-material/Edit'; // Import the pencil icon
import DeleteIcon from '@mui/icons-material/Delete'; // Import the delete icon
import "../App.css";

const HomePage = () => {
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Track if the user is an admin
  const { setFavoriteCount } = useFavorites(); // Use setFavoriteCount from context
  const navigate = useNavigate(); // Initialize navigate
  const [sortBy, setSortBy] = useState<string>(""); // Track sorting criteria

  const fetchFlats = async () => {
    try {
      const flatsCollection = collection(db, "flats");
      const flatsSnapshot = await getDocs(flatsCollection);
      const flatsList = flatsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFlats(flatsList);
    } catch (err) {
      setError("Error fetching flats");
      console.error("Error fetching flats:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user favorites and admin status
  const fetchUserData = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnapshot = await getDoc(userDocRef);
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();

        // Fetch favorites
        if (userData.favorites) {
          const favoritesObj: { [key: string]: boolean } = {};
          userData.favorites.forEach((flatId: string) => {
            favoritesObj[flatId] = true;
          });
          setFavorites(favoritesObj);
          setFavoriteCount(userData.favorites.length); // Update favorite count
        }

        // Fetch admin status
        setIsAdmin(userData.isAdmin || false); // Set isAdmin state
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  useEffect(() => {
    fetchFlats();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserData(user.uid);
      } else {
        setFavorites({});
        setFavoriteCount(0); // Reset favorite count
      }
    });

    return () => unsubscribe();
  }, []);

  // Sort flats based on the selected criteria
  const sortFlats = (criteria: string) => {
    const sortedFlats = [...flats];
    switch (criteria) {
      case "priceAsc":
        sortedFlats.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        sortedFlats.sort((a, b) => b.price - a.price);
        break;
      case "areaAsc":
        sortedFlats.sort((a, b) => a.area - b.area);
        break;
      case "areaDesc":
        sortedFlats.sort((a, b) => b.area - a.area);
        break;
      default:
        break;
    }
    setFlats(sortedFlats);
  };

  // Handle sorting criteria change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const criteria = e.target.value;
    setSortBy(criteria);
    sortFlats(criteria);
  };

  const toggleFavorite = async (id: string) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to add favorites.");
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        let updatedFavorites = userData.favorites || [];

        if (favorites[id]) {
          updatedFavorites = updatedFavorites.filter((flatId: string) => flatId !== id);
        } else {
          updatedFavorites.push(id);
        }

        await updateDoc(userDocRef, {
          favorites: updatedFavorites,
        });

        setFavorites((prevFavorites) => ({
          ...prevFavorites,
          [id]: !prevFavorites[id],
        }));

        setFavoriteCount(updatedFavorites.length); // Update favorite count
      }
    } catch (err) {
      console.error("Error updating favorites:", err);
    }
  };

  // Handle flat deletion
  const handleDeleteFlat = async (flatId: string) => {
    if (window.confirm("Are you sure you want to delete this flat?")) {
      try {
        const flatRef = doc(db, "flats", flatId);
        const flatSnapshot = await getDoc(flatRef);

        // Only proceed if the flat exists
        if (flatSnapshot.exists()) {
          // Check if the current user has the flat in their favorites
          const user = auth.currentUser;
          if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnapshot = await getDoc(userDocRef);

            if (userDocSnapshot.exists()) {
              const userData = userDocSnapshot.data();
              let updatedFavorites = userData.favorites || [];

              // Remove the flat from favorites if it exists
              updatedFavorites = updatedFavorites.filter((favoriteId: string) => favoriteId !== flatId);

              // Update the favorites in Firestore
              await updateDoc(userDocRef, {
                favorites: updatedFavorites,
              });

              // Update the favorites state and count
              setFavorites((prevFavorites) => {
                const newFavorites = { ...prevFavorites };
                delete newFavorites[flatId]; // Remove the deleted flat from state
                return newFavorites;
              });

              setFavoriteCount(updatedFavorites.length); // Update favorite count
            }
          }

          // Delete the flat from Firestore
          await deleteDoc(flatRef);
          setFlats(flats.filter((flat) => flat.id !== flatId)); // Update state after deletion
        }
      } catch (err) {
        setError("Failed to delete flat");
        console.error("Error deleting flat:", err);
      }
    }
  };


  return (
    <div className="home-page">
      <h1 className="title">All Flats</h1>
      {/* Sorting dropdown */}
      <div className="sort-container">
        <label htmlFor="sort">Sort by:</label>
        <select id="sort" value={sortBy} onChange={handleSortChange}>
          <option value="">None</option>
          <option value="priceAsc">Price (Low to High)</option>
          <option value="priceDesc">Price (High to Low)</option>
          <option value="areaAsc">Area (Low to High)</option>
          <option value="areaDesc">Area (High to Low)</option>
        </select>
      </div>
      {loading ? (
        <div className="loading">
          <CircularIndeterminate />
        </div>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <div className="flat-cards-container">
          {flats.map((flat) => {
            const isOwner = auth.currentUser?.email === flat.ownerEmail; // Check if current user is the owner
            const canEdit = isOwner || isAdmin; // Allow editing if user is owner or admin

            return (
              <div key={flat.id} className="flat-card">
                {/* Action buttons (Edit and Delete) */}
                <div className="action-buttons">
                  {canEdit && (
                    <button
                      className="action-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/edit-flat/${flat.id}`); // Navigate to edit page
                      }}
                    >
                      <EditIcon fontSize="small" /> {/* Pencil icon */}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="action-button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteFlat(flat.id); // Delete the flat
                      }}
                    >
                      <DeleteIcon fontSize="small" /> {/* Delete icon */}
                    </button>
                  )}
                </div>
                <Link to={`/flat/${flat.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2>{flat.title}</h2>
                  <p>
                    <strong>City:</strong> {flat.city}{" "}

                  </p>
                  <p>
                    <strong>Owner:</strong> {flat.ownerName} ({flat.ownerEmail})
                  </p>
                  {/* Display price and area */}
                  <p>
                    <strong>Price:</strong> {flat.price} €
                  </p>
                  <p>
                    <strong>Area:</strong> {flat.area} m²
                  </p>
                </Link>
                <button
                  className="favorite-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(flat.id);
                  }}
                >
                  {favorites[flat.id] ? "❤️ Added to Favorites" : "🤍 Add to Favorites"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomePage;