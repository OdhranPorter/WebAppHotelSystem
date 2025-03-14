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
  getDoc,
  runTransaction,
  setDoc
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
    priceDisplay.textContent = `€${typeData.price}/night`;

    // Fetch fully booked dates for the room type
    const fullyBookedDates = await getFullyBookedDates(roomType);

    // Initialize date picker with disabled dates
    flatpickr(datePickerInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      disable: fullyBookedDates,
      onChange: async (selectedDates, dateStr, instance) => {
        const bookingSummary = document.getElementById('bookingSummary');
        const confirmBtn = document.getElementById('confirmBookingBtn');
        
        if (selectedDates.length === 2) {
          selectedRoomId = await findAvailableRoom(roomType, selectedDates);
          
          if (!selectedRoomId) {
            alert("No available rooms for selected dates");
            instance.clear();
            bookingSummary.style.display = 'none';
            confirmBtn.style.display = 'none';
          } else {
            // Show booking summary
            bookingSummary.style.display = 'block';
            confirmBtn.style.display = 'inline-block';
            document.getElementById('summaryRoomType').textContent = `${roomType} Room`;
            document.getElementById('summaryRoomId').textContent = selectedRoomId;
            document.getElementById('summaryDates').textContent = 
              `${instance.formatDate(selectedDates[0], "Y-m-d")} to ${instance.formatDate(selectedDates[1], "Y-m-d")}`;
            
            // Calculate total nights and price
            const nights = Math.ceil((selectedDates[1] - selectedDates[0]) / (1000 * 3600 * 24));
            document.getElementById('summaryNights').textContent = nights;
            document.getElementById('summaryPrice').textContent = nights * typeData.price;
          }
        } else {
          bookingSummary.style.display = 'none';
          confirmBtn.style.display = 'none';
        }
      }
    });
  } catch (error) {
    console.error("Error initializing booking:", error);
  }
});

async function getFullyBookedDates(roomType) {
  const fullyBookedDates = [];
  const roomsQuery = query(collection(db, "Room"), where("type", "==", roomType));
  const roomsSnapshot = await getDocs(roomsQuery);

  // Get all rooms of this type
  const roomIds = roomsSnapshot.docs.map(doc => doc.id);

  // Create a map to track booked dates for each room
  const bookedDatesMap = new Map();

  // Fetch bookings for each room
  for (const roomId of roomIds) {
    const bookingsQuery = query(collection(db, "Booking"), where("roomID", "==", roomId));
    const bookingsSnapshot = await getDocs(bookingsQuery);

    const bookedDates = [];
    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data();
      const startDate = new Date(bookingData.checkInDate);
      const endDate = new Date(bookingData.checkOutDate);

      // Add each date in the range to the bookedDates array
      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        bookedDates.push(d.toISOString().split('T')[0]);
      }
    }

    // Store booked dates for this room
    bookedDatesMap.set(roomId, bookedDates);
  }

  // Determine fully booked dates
  if (roomIds.length > 0) {
    // Get all unique dates from all rooms
    const allDates = [...new Set([...bookedDatesMap.values()].flat())];

    // Check each date to see if it's fully booked
    for (const date of allDates) {
      let isFullyBooked = true;
      for (const roomId of roomIds) {
        if (!bookedDatesMap.get(roomId).includes(date)) {
          isFullyBooked = false;
          break;
        }
      }
      if (isFullyBooked) {
        fullyBookedDates.push(date);
      }
    }
  }

  return fullyBookedDates;
}

async function findAvailableRoom(roomType, selectedDates) {
  const [startDate, endDate] = selectedDates;

  // Get all rooms of this type
  const roomsQuery = query(collection(db, "Room"), where("type", "==", roomType));
  const roomsSnapshot = await getDocs(roomsQuery);

  for (const roomDoc of roomsSnapshot.docs) {
    const roomId = roomDoc.id;

    // Check if the room is available for the selected dates
    const isAvailable = await isRoomAvailable(roomId, startDate, endDate);
    if (isAvailable) {
      return roomId; // Return the first available room ID
    }
  }
  return null; // No available rooms
}

async function isRoomAvailable(roomId, startDate, endDate) {
  // Query bookings for the selected room
  const bookingsQuery = query(
    collection(db, "Booking"),
    where("roomID", "==", roomId)
  );
  const bookingsSnapshot = await getDocs(bookingsQuery);

  for (const bookingDoc of bookingsSnapshot.docs) {
    const bookingData = bookingDoc.data();
    const bookingStart = new Date(bookingData.checkInDate);
    const bookingEnd = new Date(bookingData.checkOutDate);

    // Check for overlapping dates
    if (
      (startDate >= bookingStart && startDate < bookingEnd) || // New booking starts during an existing booking
      (endDate > bookingStart && endDate <= bookingEnd) || // New booking ends during an existing booking
      (startDate <= bookingStart && endDate >= bookingEnd) // New booking spans an existing booking
    ) {
      return false; // Room is not available
    }
  }
  return true; // Room is available
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
      // Check if the room is still available for the selected dates
      const isAvailable = await isRoomAvailable(
        selectedRoomId,
        fpInstance.selectedDates[0],
        fpInstance.selectedDates[1]
      );

      if (!isAvailable) {
        alert("The room is no longer available for the selected dates. Please choose different dates.");
        return;
      }

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
        status: "booked"
      });

      alert(`Booking confirmed! Room: ${selectedRoomId}`);
      window.location.href = "profile";
    } catch (error) {
      console.error("Booking failed:", error);
      alert(`Booking failed: ${error.message}`);
    }
  });
}

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