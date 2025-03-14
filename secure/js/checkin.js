import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase configuration (replace with your own config if needed)
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firebasestorage.app",
  messagingSenderId: "385718256742",
  appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to load bookings with status "booked"
async function loadBookings() {
  const bookingsList = document.getElementById("bookingsList");
  bookingsList.innerHTML = "";
  try {
    // Query for bookings with status "booked"
    const bookingsQuery = query(
      collection(db, "Booking"),
      where("status", "==", "booked")
    );
    const querySnapshot = await getDocs(bookingsQuery);

    if (querySnapshot.empty) {
      bookingsList.innerHTML = "<p>No bookings pending check-in.</p>";
      return;
    }
    // Create a card for each booking
    querySnapshot.forEach(docSnap => {
      const booking = docSnap.data();
      const bookingId = docSnap.id;
      const card = document.createElement("div");
      card.className = "booking-card";
      card.innerHTML = `
        <h3>Room: ${booking.roomID}</h3>
        <p>Check-In: ${booking.checkInDate} | Check-Out: ${booking.checkOutDate}</p>
        <p>Status: ${booking.status}</p>
        <button onclick="checkInBooking('${bookingId}')">Check In</button>
      `;
      bookingsList.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading bookings", error);
    bookingsList.innerHTML = "<p>Error loading bookings.</p>";
  }
}

// Expose checkInBooking so it can be called by inline onclick in the HTML
window.checkInBooking = async function(bookingId) {
  try {
    // Update the booking's status to "checkedin"
    await updateDoc(doc(db, "Booking", bookingId), {
      status: "checkedin"
    });
    alert("Booking checked in successfully.");
    loadBookings(); // Refresh the bookings list
  } catch (error) {
    console.error("Error checking in booking", error);
    alert("Failed to check in booking: " + error.message);
  }
};

// Load bookings on page load
loadBookings();
