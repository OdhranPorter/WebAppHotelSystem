import { 
  initializeApp 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
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

/**
 * Helper function to parse a date from a Firestore Timestamp or a string.
 */
function parseDate(dateField) {
  if (dateField && typeof dateField.toDate === 'function') {
    return dateField.toDate();
  } else {
    return new Date(dateField);
  }
}

/**
 * Loads all bookings with status "booked", then splits them into two groups:
 * - Check-In: bookings whose checkInDate equals today.
 * - Check-Out: bookings whose checkOutDate equals today.
 * A search term (if provided) is applied to both groups.
 */
async function loadBookings(searchTerm = '') {
  const checkinList = document.getElementById("checkinBookingsList");
  const checkoutList = document.getElementById("checkoutBookingsList");
  checkinList.innerHTML = "<p>Loading check-in bookings...</p>";
  checkoutList.innerHTML = "<p>Loading check-out bookings...</p>";
  
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
        const guestRef = doc(db, "Guest", booking.guestID);
        const guestSnap = await getDoc(guestRef);
        if (guestSnap.exists()) {
          const guestData = guestSnap.data();
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

    // Get today's date string for comparison
    const todayStr = new Date().toDateString();
    
    // Filter for check-in bookings: booking.checkInDate equals today.
    const checkinBookings = bookings.filter(booking => {
      const checkInDate = parseDate(booking.checkInDate).toDateString();
      return checkInDate === todayStr;
    });
    
    // Filter for check-out bookings: booking.checkOutDate equals today.
    const checkoutBookings = bookings.filter(booking => {
      const checkOutDate = parseDate(booking.checkOutDate).toDateString();
      return checkOutDate === todayStr;
    });

    // Apply search filter if provided
    const searchLower = searchTerm.toLowerCase();
    const filteredCheckin = checkinBookings.filter(booking =>
      booking.bookID.toLowerCase().includes(searchLower) ||
      booking.guestName.toLowerCase().includes(searchLower)
    );
    const filteredCheckout = checkoutBookings.filter(booking =>
      booking.bookID.toLowerCase().includes(searchLower) ||
      booking.guestName.toLowerCase().includes(searchLower)
    );

    renderBookings(filteredCheckin, "checkin");
    renderBookings(filteredCheckout, "checkout");

  } catch (error) {
    console.error("Error loading bookings:", error);
    document.getElementById("checkinBookingsList").innerHTML = "<p>Error loading bookings. Please check console.</p>";
    document.getElementById("checkoutBookingsList").innerHTML = "<p>Error loading bookings. Please check console.</p>";
  }
}

/**
 * Renders bookings for a given viewType ("checkin" or "checkout").
 */
function renderBookings(bookings, viewType) {
  const container = viewType === "checkin" 
    ? document.getElementById("checkinBookingsList") 
    : document.getElementById("checkoutBookingsList");
  container.innerHTML = "";

  if (bookings.length === 0) {
    container.innerHTML = "<p>No matching bookings found</p>";
    return;
  }

  bookings.forEach(booking => {
    const card = document.createElement("div");
    card.className = "booking-card";
    card.innerHTML = `
      <h3>Booking ID: ${booking.bookID}</h3>
      <p>Guest: ${booking.guestName}</p>
      <p>Room: ${booking.roomID}</p>
      <p>Check-In: ${parseDate(booking.checkInDate).toLocaleString()}</p>
      <p>Check-Out: ${parseDate(booking.checkOutDate).toLocaleString()}</p>
      <button class="${viewType}-button" onclick="${viewType}Booking('${booking.id}')">
        ${viewType === "checkin" ? "Check In" : "Check Out"}
      </button>
    `;
    container.appendChild(card);
  });
}

/**
 * Action for check-in: update booking status to "checkedin" and refresh bookings.
 */
window.checkinBooking = async function(bookingId) {
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

/**
 * Action for check-out: update booking status to "checkedout" and refresh bookings.
 */
window.checkoutBooking = async function(bookingId) {
  try {
    await updateDoc(doc(db, "Booking", bookingId), {
      status: "checkedout"
    });
    alert("Successfully checked out!");
    loadBookings(document.getElementById('searchInput').value);
  } catch (error) {
    console.error("Check-out failed:", error);
    alert(`Check-out failed: ${error.message}`);
  }
};

// Search function for both views.
window.searchBookings = function() {
  const searchTerm = document.getElementById('searchInput').value;
  loadBookings(searchTerm);
};

/**
 * Toggle between Check-In and Check-Out views and refresh the data.
 */
window.showView = function(view) {
  const checkinSection = document.getElementById("checkinSection");
  const checkoutSection = document.getElementById("checkoutSection");
  const checkinNav = document.getElementById("checkinNav");
  const checkoutNav = document.getElementById("checkoutNav");
  
  if (view === "checkin") {
    checkinSection.style.display = "block";
    checkoutSection.style.display = "none";
    checkinNav.classList.add("active");
    checkoutNav.classList.remove("active");
  } else {
    checkinSection.style.display = "none";
    checkoutSection.style.display = "block";
    checkoutNav.classList.add("active");
    checkinNav.classList.remove("active");
  }
  
  // Reload bookings when switching views.
  loadBookings(document.getElementById('searchInput').value);
};

// Initial load: show check-in view by default.
showView("checkin");
loadBookings();
