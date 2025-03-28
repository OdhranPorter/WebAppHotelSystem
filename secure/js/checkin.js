import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,    
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firebasestorage.app",
  messagingSenderId: "385718256742",
  appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadBookings(searchTerm = '') {
  const bookingsList = document.getElementById("bookingsList");
  bookingsList.innerHTML = "<p>Loading bookings...</p>";
  
  try {
    const q = query(
      collection(db, "Booking"),
      where("status", "==", "booked")
    );
    
    const querySnapshot = await getDocs(q);
    const bookings = [];

    for (const docSnap of querySnapshot.docs) {
      const booking = docSnap.data();
      let guestName = 'Unknown';
      let debugInfo = '';

      try {
        console.log(`Fetching guest: ${booking.guestID}`);
        const guestRef = doc(db, "Guest", booking.guestID);
        const guestSnap = await getDoc(guestRef);

        if (guestSnap.exists()) {
          const guestData = guestSnap.data();
          console.log("Guest data:", guestData);
          
          if (guestData.fName && guestData.sName) {
            guestName = `${guestData.fName} ${guestData.sName}`;
          } else {
            debugInfo = ' (Missing name fields)';
          }
        } else {
          debugInfo = ' (Guest not found)';
        }
      } catch (error) {
        console.error(`Error fetching guest ${booking.guestID}:`, error);
        debugInfo = ' (Error loading guest)';
      }

      bookings.push({
        id: docSnap.id,
        ...booking,
        guestName: guestName + debugInfo
      });
    }

    // Filter bookings for the current date only.
    const today = new Date().toDateString();
    const todaysBookings = bookings.filter(booking => {
      // Convert booking.checkInDate to a Date object and then to a string.
      return new Date(booking.checkInDate).toDateString() === today;
    });

    // Then filter by search term if provided.
    const filtered = todaysBookings.filter(booking => {
      const searchLower = searchTerm.toLowerCase();
      return booking.bookID.toLowerCase().includes(searchLower) ||
             booking.guestName.toLowerCase().includes(searchLower);
    });

    renderBookings(filtered);

  } catch (error) {
    console.error("Error loading bookings:", error);
    bookingsList.innerHTML = "<p>Error loading bookings. Please check console.</p>";
  }
}

function renderBookings(bookings) {
  const bookingsList = document.getElementById("bookingsList");
  bookingsList.innerHTML = "";

  if (bookings.length === 0) {
    bookingsList.innerHTML = "<p>No matching bookings found</p>";
    return;
  }

  bookings.forEach(booking => {
    const card = document.createElement("div");
    card.className = "booking-card";
    card.innerHTML = `
      <h3>Booking ID: ${booking.bookID}</h3>
      <p>Guest: ${booking.guestName}</p>
      <p>Room: ${booking.roomID}</p>
      <p>Check-In: ${booking.checkInDate}</p>
      <p>Check-Out: ${booking.checkOutDate}</p>
      <button class="checkin-button" onclick="checkInBooking('${booking.id}')">
        Check In
      </button>
    `;
    bookingsList.appendChild(card);
  });
}

// Date formatting helper (if needed)
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

window.checkInBooking = async function(bookingId) {
  try {
    await updateDoc(doc(db, "Booking", bookingId), {
      status: "checkedin"
    });
    alert("Successfully checked in!");
    loadBookings(document.getElementById('searchInput').value);
  } catch (error) {
    console.error("Check-in failed:", error);
    alert(`Check-in failed: ${error.message}`);
  }
};

window.searchBookings = function() {
  const searchTerm = document.getElementById('searchInput').value;
  loadBookings(searchTerm);
};

// Initial load
loadBookings();
