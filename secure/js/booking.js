// booking.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { 
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  setDoc,
  updateDoc,
  arrayUnion
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
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const datePickerInput = document.getElementById("datePicker");
const confirmBookingBtn = document.getElementById("confirmBookingBtn");
const roomTypeDisplay = document.getElementById("roomTypeDisplay");
const priceDisplay = document.getElementById("priceDisplay");

// Get roomType from URL
const urlParams = new URLSearchParams(window.location.search);
const roomType = urlParams.get("roomType");
let selectedRoomId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = `login?from=booking?roomType=${encodeURIComponent(roomType)}`;
    return;
  }

  if (!roomType) {
    alert("No room type selected!");
    window.location.href = "rooms";
    return;
  }

  try {
    // Fetch room type details
    const typeDoc = await getDoc(doc(db, "RoomType", roomType));
    if (!typeDoc.exists()) {
      alert("Invalid room type!");
      window.location.href = "rooms";
      return;
    }
    const typeData = typeDoc.data();
    
    // Update UI
    roomTypeDisplay.textContent = `${roomType} Room`;
    priceDisplay.textContent = `$${typeData.price}/night`;

    // Initialize date picker
    flatpickr(datePickerInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      onChange: async (selectedDates) => {
        if (selectedDates.length === 2) {
          // Find first available room for these dates
          selectedRoomId = await findAvailableRoom(roomType, selectedDates);
          if (!selectedRoomId) {
            alert("No available rooms for selected dates");
            datePickerInput._flatpickr.clear();
          }
        }
      }
    });
  } catch (error) {
    console.error("Error initializing booking:", error);
  }
});

async function findAvailableRoom(roomType, selectedDates) {
  const [startDate, endDate] = selectedDates;
  const dateRange = generateDateRange(startDate, endDate);

  // Get all rooms of this type
  const roomsQuery = query(collection(db, "Room"), where("type", "==", roomType));
  const roomsSnapshot = await getDocs(roomsQuery);

  for (const roomDoc of roomsSnapshot.docs) {
    const roomData = roomDoc.data();
    const bookedDates = roomData.bookedDates || [];
    
    // Check if all dates in range are available
    const isAvailable = dateRange.every(date => !bookedDates.includes(date));
    
    if (isAvailable) {
      return roomDoc.id; // Return first available room ID
    }
  }
  return null;
}

// Confirm booking handler
if (confirmBookingBtn) {
  confirmBookingBtn.addEventListener("click", async () => {
    const fpInstance = datePickerInput._flatpickr;
    if (!selectedRoomId || !fpInstance || fpInstance.selectedDates.length !== 2) {
      alert("Please select valid dates first");
      return;
    }

    try {
      // Generate booking ID
      const bookingId = await getNextBookingId();
      const bookingIdStr = `B${bookingId}`;

      // Create booking document
      await setDoc(doc(db, "Booking", bookingIdStr), {
        bookID: bookingIdStr,
        guestID: auth.currentUser.uid,
        roomID: selectedRoomId,
        checkInDate: fpInstance.formatDate(fpInstance.selectedDates[0], "Y-m-d"),
        checkOutDate: fpInstance.formatDate(fpInstance.selectedDates[1], "Y-m-d"),
        status: "confirmed"
      });

      // Update room's booked dates
      const dateRange = generateDateRange(fpInstance.selectedDates[0], fpInstance.selectedDates[1]);
      await updateDoc(doc(db, "Room", selectedRoomId), {
        bookedDates: arrayUnion(...dateRange)
      });

      alert(`Booking confirmed! Room: ${selectedRoomId}`);
      window.location.href = "profile";
    } catch (error) {
      console.error("Booking failed:", error);
      alert(`Booking failed: ${error.message}`);
    }
  });
}

// Helper function to generate date range
function generateDateRange(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Helper function to get next booking ID
async function getNextBookingId() {
  const counterRef = doc(db, "Counters", "bookingCounter");
  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    if (!counterSnap.exists()) {
      transaction.set(counterRef, { count: 1 });
      return 1;
    } else {
      const currentCount = counterSnap.data().count || 0;
      const newCount = currentCount + 1;
      transaction.update(counterRef, { count: newCount });
      return newCount;
    }
  });
}