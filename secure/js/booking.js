// booking.js

import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
  
  import {
    getAuth,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
  
  import {
    getFirestore,
    doc,
    getDoc,
    runTransaction,
    setDoc,
    updateDoc,
    arrayUnion
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
  
  // Flatpickr is loaded in booking.html
  // We'll assume you've included <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  
  ////////////////////////////////////////
  // 1. Firebase Config & Initialization
  ////////////////////////////////////////
  const firebaseConfig = {
    apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
    authDomain: "hotel-booking-3aad3.firebaseapp.com",
    projectId: "hotel-booking-3aad3",
    storageBucket: "hotel-booking-3aad3.firebasestorage.app",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };
  
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  ////////////////////////////////////////
  // 2. Parse roomId from the URL
  ////////////////////////////////////////
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("roomId") || "R101"; // fallback if not provided
  
  // DOM references
  const datePickerInput   = document.getElementById("datePicker");
  const confirmBookingBtn = document.getElementById("confirmBookingBtn");
  
  ////////////////////////////////////////
  // 3. Generate date array helper
  ////////////////////////////////////////
  /**
   * Returns an array of string dates "YYYY-MM-DD" from start to end inclusive.
   */
  function generateDateRange(startDate, endDate) {
    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      // Convert to YYYY-MM-DD
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
  
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
  
  ////////////////////////////////////////
  // 4. Get Next Booking ID (auto-increment)
  ////////////////////////////////////////
  async function getNextBookingId() {
    // We'll store the doc in "Counters/bookingCounter" with a field "count"
    const counterRef = doc(db, "Counters", "bookingCounter");
    return runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      if (!counterSnap.exists()) {
        // If it doesn't exist, initialize it
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
  
  ////////////////////////////////////////
  // 5. onAuthStateChanged => If not logged in => go login
  ////////////////////////////////////////
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in => redirect
      window.location.href = `login.html?from=booking.html?roomId=${roomId}`;
      return;
    }
  
    // If logged in => fetch the room doc, disable past + already-booked dates
    const roomSnap = await getDoc(doc(db, "Room", roomId));
    if (!roomSnap.exists()) {
      alert(`Room ${roomId} not found!`);
      return;
    }
  
    const roomData = roomSnap.data();
    const bookedDates = roomData.bookedDates || [];
    
    // Initialize the datePicker with disabled options
    flatpickr(datePickerInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      disable: bookedDates, // disable already-booked
      onChange: (selectedDates) => {
        console.log("Selected range:", selectedDates);
      }
    });
  });
  
  ////////////////////////////////////////
  // 6. Confirm Booking => create Booking doc, mark room dates
  ////////////////////////////////////////
  if (confirmBookingBtn) {
    confirmBookingBtn.addEventListener("click", async () => {
      const fpInstance = datePickerInput._flatpickr;
      if (!fpInstance || fpInstance.selectedDates.length < 2) {
        alert("Please select check-in and check-out dates.");
        return;
      }
  
      // Extract start & end
      const [startDate, endDate] = fpInstance.selectedDates;
      if (!startDate || !endDate) {
        alert("Please select both a start and end date.");
        return;
      }
  
      // Generate daily dates for range
      const allDates = generateDateRange(startDate, endDate);
      console.log("Booking range:", allDates);
  
      try {
        // 1) Generate next bookingId
        const bookingId = await getNextBookingId();
        const bookingIdStr = `B${bookingId}`; // e.g., "B101"
  
        // 2) Create a booking doc in "Booking"
        //    We'll use bookingIdStr as doc ID, or you can store it as a field.
        const userId = auth.currentUser.uid;
        await setDoc(doc(db, "Booking", bookingIdStr), {
          bookID: bookingIdStr,
          guestID: userId,
          roomID: roomId,
          checkInDate: fpInstance.formatDate(startDate, "Y-m-d"),
          checkOutDate: fpInstance.formatDate(endDate, "Y-m-d"),
          status: "pending"
        });
  
        // 3) Mark these dates as booked in the room doc
        //    We do arrayUnion for each date. We'll do one update call arrayUnion(...allDates)
        await updateDoc(doc(db, "Room", roomId), {
          bookedDates: arrayUnion(...allDates)
        });
  
        alert(`Booking ${bookingIdStr} created successfully!`);
        // Possibly redirect to a "Booking Confirmation" page
        window.location.href = "home.html";
      } catch (err) {
        console.error("Error creating booking:", err);
        alert(`Error: ${err.message}`);
      }
    });
  }
  