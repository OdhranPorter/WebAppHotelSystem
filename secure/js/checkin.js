/* ==============================================================
   checkin.js – Front‑desk Check‑In / Check‑Out Console
   --------------------------------------------------------------
   In this module we enable staff to:

     • View bookings due to check‑in today
     • View bookings due to check‑out today
     • Search either list by Booking‑ID or Guest name
     • Flip a booking’s status from “booked” → “checkedin”
       and from “checkedin” → “checkedout”

   All Firestore reads/writes remain untouched; we only add comments.
   ============================================================== */


/* 1. Firebase imports -------------------------------------------------- */
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

/* 2. Firebase initialisation ------------------------------------------ */
const firebaseConfig = {
  apiKey:            "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain:        "hotel-booking-3aad3.firebaseapp.com",
  projectId:         "hotel-booking-3aad3",
  storageBucket:     "hotel-booking-3aad3.firebasestorage.app",
  messagingSenderId: "385718256742",
  appId:             "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* ======================================================================
   3. Utility – safe date parsing
   ----------------------------------------------------------------------
   Firestore Timestamps arrive with .toDate(); strings do not.  We normalise
   both into vanilla Date objects so comparisons are easy.
   ====================================================================== */
function parseDate(dateField) {
  return (dateField && typeof dateField.toDate === "function")
           ? dateField.toDate()
           : new Date(dateField);
}

/* ======================================================================
   4. loadBookings()
   ----------------------------------------------------------------------
   We pull all “booked”   docs (candidates for check‑in)
   and all “checkedin” docs (candidates for check‑out),
   then split/filter by today’s date and an optional search term.
   ====================================================================== */
async function loadBookings(searchTerm = "") {
  const checkinList  = document.getElementById("checkinBookingsList");
  const checkoutList = document.getElementById("checkoutBookingsList");
  checkinList.innerHTML  = "<p>Loading check‑in bookings...</p>";
  checkoutList.innerHTML = "<p>Loading check‑out bookings...</p>";

  try {
    /* 4‑A  Fetch “booked” docs */
    const inSnap  = await getDocs(query(collection(db,"Booking"), where("status","==","booked")));
    const inArr   = [];
    for (const docSnap of inSnap.docs) inArr.push(await processBookingDoc(docSnap));

    /* 4‑B  Fetch “checkedin” docs */
    const outSnap = await getDocs(query(collection(db,"Booking"), where("status","==","checkedin")));
    const outArr  = [];
    for (const docSnap of outSnap.docs) outArr.push(await processBookingDoc(docSnap));

    /* 4‑C  Compare against today */
    const today = new Date().toDateString();
    const dueIn  = inArr .filter(b => parseDate(b.checkInDate) .toDateString() === today);
    const dueOut = outArr.filter(b => parseDate(b.checkOutDate).toDateString() === today);

    /* 4‑D  Optional text search */
    const term = searchTerm.toLowerCase();
    const finIn  = dueIn .filter(b => b.bookID.toLowerCase().includes(term) || b.guestName.toLowerCase().includes(term));
    const finOut = dueOut.filter(b => b.bookID.toLowerCase().includes(term) || b.guestName.toLowerCase().includes(term));

    /* 4‑E  Paint the two lists */
    renderBookings(finIn,  "checkin");
    renderBookings(finOut, "checkout");

  } catch (err) {
    console.error("Error loading bookings:", err);
    checkinList .innerHTML = "<p>Error loading bookings. Please check console.</p>";
    checkoutList.innerHTML = "<p>Error loading bookings. Please check console.</p>";
  }
}

/* ======================================================================
   5. processBookingDoc() – enrich a booking with guest name
   ====================================================================== */
async function processBookingDoc(docSnap) {
  const booking   = docSnap.data();
  let guestName   = "Unknown";
  let debugInfo   = "";

  try {
    const guestRef  = doc(db,"Guest", booking.guestID);
    const guestSnap = await getDoc(guestRef);
    if (guestSnap.exists()) {
      const g = guestSnap.data();
      guestName = `${g.fName||""} ${g.sName||""}`.trim() || "Unknown";
      if (!g.fName && !g.sName) debugInfo = " (Missing name fields)";
    } else {
      debugInfo = " (Guest not found)";
    }
  } catch (err) {
    console.error(`Error fetching guest ${booking.guestID}:`, err);
    debugInfo = " (Error loading guest)";
  }

  return { id: docSnap.id, ...booking, guestName: guestName + debugInfo };
}

/* ======================================================================
   6. renderBookings() – draw card list for either view
   ====================================================================== */
function renderBookings(bookings, viewType) {
  const container = (viewType === "checkin")
                      ? document.getElementById("checkinBookingsList")
                      : document.getElementById("checkoutBookingsList");
  container.innerHTML = "";

  if (bookings.length === 0) {
    container.innerHTML = "<p>No matching bookings found</p>";
    return;
  }

  bookings.forEach(b => {
    const card = document.createElement("div");
    card.className = "booking-card";
    card.innerHTML = `
      <h3>Booking ID: ${b.bookID}</h3>
      <p>Guest: ${b.guestName}</p>
      <p>Room: ${b.roomID}</p>
      <p>Check‑In:  ${parseDate(b.checkInDate) .toLocaleString()}</p>
      <p>Check‑Out: ${parseDate(b.checkOutDate).toLocaleString()}</p>
      <button class="${viewType}-button" onclick="${viewType}Booking('${b.id}')">
        ${viewType === "checkin" ? "Check In" : "Check Out"}
      </button>
    `;
    container.appendChild(card);
  });
}

/* ======================================================================
   7. Front‑desk actions – checkinBooking / checkoutBooking
   ====================================================================== */
window.checkinBooking = async function (bookingId) {
  try {
    await updateDoc(doc(db,"Booking", bookingId), { status:"checkedin" });
    alert("Successfully checked in!");
    loadBookings(document.getElementById("searchInput").value);
  } catch (err) {
    console.error("Check‑in failed:", err);
    alert(`Check‑in failed: ${err.message}`);
  }
};

window.checkoutBooking = async function (bookingId) {
  try {
    await updateDoc(doc(db,"Booking", bookingId), { status:"checkedout" });
    alert("Successfully checked out!");
    loadBookings(document.getElementById("searchInput").value);
  } catch (err) {
    console.error("Check‑out failed:", err);
    alert(`Check‑out failed: ${err.message}`);
  }
};

/* ======================================================================
   8. UI glue – search box, tab toggling, initial view
   ====================================================================== */
window.searchBookings = function () {
  loadBookings(document.getElementById("searchInput").value);
};

window.showView = function (view) {
  const checkinSec  = document.getElementById("checkinSection");
  const checkoutSec = document.getElementById("checkoutSection");
  const checkinNav  = document.getElementById("checkinNav");
  const checkoutNav = document.getElementById("checkoutNav");

  if (view === "checkin") {
    checkinSec.style.display  = "block";
    checkoutSec.style.display = "none";
    checkinNav.classList.add("active");
    checkoutNav.classList.remove("active");
  } else {
    checkinSec.style.display  = "none";
    checkoutSec.style.display = "block";
    checkoutNav.classList.add("active");
    checkinNav.classList.remove("active");
  }
  loadBookings(document.getElementById("searchInput").value);  // refresh list
};

/* 9. Kick‑off – default to Check‑In view on load ---------------------- */
showView("checkin");
loadBookings();
