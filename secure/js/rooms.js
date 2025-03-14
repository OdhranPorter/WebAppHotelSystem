import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs,doc,getDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
    authDomain: "hotel-booking-3aad3.firebaseapp.com",
    projectId: "hotel-booking-3aad3",
    storageBucket: "hotel-booking-3aad3.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let logoutBtn = document.getElementById("logout-btn");

// Check user authentication status
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Fetch booked rooms
        loadBookedRooms(user.uid);
    } else {
        // Redirect to login if not logged in
       // window.location.href = "/project/login.html";
    }
});

// Function to load booked rooms
async function loadBookedRooms(userId) {
    const roomsContainer = document.getElementById("rooms-container");
    const roomTemplate = document.getElementById("room-card-template"); // Get the template

    roomsContainer.innerHTML = "<p>Loading rooms...</p>";

    try {
        console.log("Fetching bookings for userId:", userId);

        // Step 1: Query bookings by guestID
        const bookingsQuery = query(collection(db, "Booking"), where("guestID", "==", userId));
        const bookingsSnapshot = await getDocs(bookingsQuery);

        if (bookingsSnapshot.empty) {
            console.log("No bookings found for user:", userId);
            roomsContainer.innerHTML = "<p>No rooms booked.</p>";
            return;
        }

        // Step 2: Extract room IDs
        const roomIds = [];
        bookingsSnapshot.forEach((doc) => {
            const booking = doc.data();
            console.log("Booking found:", booking);
            if (booking.roomID) {
                roomIds.push(booking.roomID);
            }
        });

        if (roomIds.length === 0) {
            console.log("No room IDs found.");
            roomsContainer.innerHTML = "<p>No rooms found for the bookings.</p>";
            return;
        }

        // Step 3: Fetch room details
        roomsContainer.innerHTML = ""; // Clear loading text

        for (const roomId of roomIds) {
            console.log("Fetching room details for Room ID:", roomId);

            const roomRef = doc(db, "Room", roomId);
            const roomSnap = await getDoc(roomRef);

            if (roomSnap.exists()) {
                let room = roomSnap.data();
                console.log("Room found:", room);
             // Fetch room type details from RoomType collection
             if (room.type) {
                const roomTypeRef = doc(db, "RoomType", room.type);
                const roomTypeSnap = await getDoc(roomTypeRef);

                if (roomTypeSnap.exists()) {
                    const roomType = roomTypeSnap.data();
                    console.log("Room Type details:", roomType);

                    // Merge Room details with RoomType details
                    room = { ...room, ...roomType };
                }
            }
                // Clone the template
                const roomCard = roomTemplate.content.cloneNode(true);
                console.log(room.images?.[0]);
                // Update template content
                roomCard.querySelector(".room-image").src = room.images?.[0] || "default-image.jpg"; // Fallback image
                roomCard.querySelector(".room-id").textContent = `Room ID: ${roomId}`;
                roomCard.querySelector(".room-type").textContent = room.type || "N/A";
                roomCard.querySelector(".room-price").textContent = room.price || "N/A";
                roomCard.querySelector(".room-amenities").textContent = room.amenities ? room.amenities.join(", ") : "No amenities listed";
                roomCard.querySelector(".room-dates").textContent = room.bookedDates ? room.bookedDates.join(", ") : "No dates available";

                // Append to the container
                roomsContainer.appendChild(roomCard);
            } else {
                console.log(`Room with ID ${roomId} not found.`);
            }
        }
    } catch (error) {
        console.error("Error loading booked rooms:", error);
        roomsContainer.innerHTML = `<p>Error loading rooms. Please try again later.</p>`;
    }
}


// Logout function
logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "../home.html";
});
