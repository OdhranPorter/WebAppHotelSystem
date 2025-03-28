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
    // Fetch check-in bookings (status: booked)
    const checkinQuery = query(
      collection(db, "Booking"),
      where("status", "==", "booked")
    );
    const checkinSnapshot = await getDocs(checkinQuery);
    const checkinBookings = [];
    for (const docSnap of checkinSnapshot.docs) {
      const booking = await processBookingDoc(docSnap);
      checkinBookings.push(booking);
    }

    // Fetch checkout bookings (status: checkedin)
    const checkoutQuery = query(
      collection(db, "Booking"),
      where("status", "==", "checkedin")
    );
    const checkoutSnapshot = await getDocs(checkoutQuery);
    const checkoutBookings = [];
    for (const docSnap of checkoutSnapshot.docs) {
      const booking = await processBookingDoc(docSnap);
      checkoutBookings.push(booking);
    }

    // Get today's date string for comparison
    const todayStr = new Date().toDateString();
    
    // Filter check-in bookings: checkInDate is today
    const filteredCheckin = checkinBookings.filter(booking => {
      const checkInDate = parseDate(booking.checkInDate).toDateString();
      return checkInDate === todayStr;
    });
    
    // Filter checkout bookings: checkOutDate is today
    const filteredCheckout = checkoutBookings.filter(booking => {
      const checkOutDate = parseDate(booking.checkOutDate).toDateString();
      return checkOutDate === todayStr;
    });

    // Apply search filter if provided
    const searchLower = searchTerm.toLowerCase();
    const finalCheckin = filteredCheckin.filter(booking =>
      booking.bookID.toLowerCase().includes(searchLower) ||
      booking.guestName.toLowerCase().includes(searchLower)
    );
    const finalCheckout = filteredCheckout.filter(booking =>
      booking.bookID.toLowerCase().includes(searchLower) ||
      booking.guestName.toLowerCase().includes(searchLower)
    );

    renderBookings(finalCheckin, "checkin");
    renderBookings(finalCheckout, "checkout");

  } catch (error) {
    console.error("Error loading bookings:", error);
    checkinList.innerHTML = "<p>Error loading bookings. Please check console.</p>";
    checkoutList.innerHTML = "<p>Error loading bookings. Please check console.</p>";
  }
}

// Add this helper function to process booking documents
async function processBookingDoc(docSnap) {
  const booking = docSnap.data();
  let guestName = 'Unknown';
  let debugInfo = '';

  try {
    const guestRef = doc(db, "Guest", booking.guestID);
    const guestSnap = await getDoc(guestRef);
    if (guestSnap.exists()) {
      const guestData = guestSnap.data();
      guestName = `${guestData.fName || ''} ${guestData.sName || ''}`.trim();
      if (!guestName) debugInfo = ' (Missing name fields)';
    } else {
      debugInfo = ' (Guest not found)';
    }
  } catch (error) {
    console.error(`Error fetching guest ${booking.guestID}:`, error);
    debugInfo = ' (Error loading guest)';
  }

  return {
    id: docSnap.id,
    ...booking,
    guestName: guestName + debugInfo
  };
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
