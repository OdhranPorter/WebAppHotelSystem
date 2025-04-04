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
  storageBucket: "hotel-booking-3aad3.appspot.com",
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
const bankDetailsModal = document.getElementById("bankDetailsModal");
const submitBankDetailsBtn = document.getElementById("submitBankDetailsBtn");
const closeModalBtn = bankDetailsModal.querySelector(".close");

// Global variables
let roomPrice = 0;
const urlParams = new URLSearchParams(window.location.search);
const roomType = urlParams.get("roomType");
let selectedRoomId = null;
let currentBookingId = null;

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
    roomPrice = typeData.price;
    
    // Update UI
    roomTypeDisplay.textContent = `${roomType} Room`;
    priceDisplay.textContent = `€${roomPrice}/night`;

    // Initialize date picker with disabled dates
    const fullyBookedDates = await getFullyBookedDates(roomType);
    
    flatpickr(datePickerInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      disable: fullyBookedDates,
      onChange: async (selectedDates, dateStr, instance) => {
        const bookingSummary = document.getElementById('bookingSummary');
        if (selectedDates.length === 2) {
          selectedRoomId = await findAvailableRoom(roomType, selectedDates);
          
          if (!selectedRoomId) {
            alert("No available rooms for selected dates");
            instance.clear();
            bookingSummary.style.display = 'none';
            confirmBookingBtn.style.display = 'none';
          } else {
            // Show booking summary
            bookingSummary.style.display = 'block';
            const nights = Math.ceil((selectedDates[1] - selectedDates[0]) / (1000 * 3600 * 24));
            const totalCost = nights * roomPrice;
            
            document.getElementById('summaryRoomType').textContent = `${roomType} Room`;
            document.getElementById('summaryRoomId').textContent = selectedRoomId;
            document.getElementById('summaryDates').textContent = 
              `${instance.formatDate(selectedDates[0], "Y-m-d")} to ${instance.formatDate(selectedDates[1], "Y-m-d")}`;
            document.getElementById('summaryNights').textContent = nights;
            document.getElementById('summaryPrice').textContent = totalCost;
            
            confirmBookingBtn.style.display = 'inline-block';
          }
        } else {
          bookingSummary.style.display = 'none';
          confirmBookingBtn.style.display = 'none';
        }
      }
    });
  } catch (error) {
    console.error("Error initializing booking:", error);
  }
});


// Add these card type detection functions
function detectCardType(number) {
  const cleaned = number.replace(/\s/g, '');
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleaned)) return type;
  }
  return 'unknown';
}

function updateCardTypeIcon(number) {
  const type = detectCardType(number);
  const icon = document.getElementById('cardTypeIcon');
  icon.style.backgroundImage = `url(images/${type}.png)`;
  icon.style.display = type === 'unknown' ? 'none' : 'block';
  
  // Update CVV max length for Amex
  const cvvField = document.getElementById('cvv');
  cvvField.maxLength = type === 'amex' ? 4 : 3;
}

// Add input formatting handlers
document.getElementById('cardNumber')?.addEventListener('input', function(e) {
  let value = e.target.value.replace(/\s/g, '');
  if (isNaN(value)) return;
  
  // Format with spaces every 4 digits
  value = value.match(/.{1,4}/g)?.join(' ').substr(0, 19) || '';
  e.target.value = value;
  updateCardTypeIcon(value);
});

document.getElementById('expiryDate')?.addEventListener('input', function(e) {
  let value = e.target.value.replace(/[^0-9]/g, '');
  if (value.length >= 2) {
    value = value.slice(0, 2) + '/' + value.slice(2, 4);
  }
  e.target.value = value.substring(0, 5);
});

// Enhanced validation function
function validatePaymentDetails() {
  let isValid = true;
  const errors = {
    nameError: '',
    numberError: '',
    expiryError: '',
    cvvError: ''
  };

  // Cardholder Name validation
  const cardHolderName = document.getElementById('cardHolderName').value.trim();
  if (!cardHolderName || !/^[a-zA-Z ]+$/.test(cardHolderName)) {
    errors.nameError = 'Please enter a valid name';
    isValid = false;
  }

  // Card Number validation
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
  if (!/^\d{16}$/.test(cardNumber)) {
    errors.numberError = 'Invalid card number';
    isValid = false;
  }

  // Expiry Date validation
  const expiryDate = document.getElementById('expiryDate').value;
  const [month, year] = expiryDate.split('/');
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
    errors.expiryError = 'Invalid expiry date';
    isValid = false;
  } else {
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    if (parseInt(year) < currentYear || 
       (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      errors.expiryError = 'Card has expired';
      isValid = false;
    }
  }

  // CVV validation
  const cvv = document.getElementById('cvv').value;
  const cardType = detectCardType(cardNumber);
  const cvvValidLength = cardType === 'amex' ? 4 : 3;
  if (!/^\d+$/.test(cvv) || cvv.length !== cvvValidLength) {
    errors.cvvError = `CVV must be ${cvvValidLength} digits`;
    isValid = false;
  }

  // Display errors
  Object.entries(errors).forEach(([id, message]) => {
    const errorElement = document.getElementById(id);
    errorElement.textContent = message;
    errorElement.style.display = message ? 'block' : 'none';
  });

  return isValid;
}

// Update payment handler
submitBankDetailsBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  
  if (!validatePaymentDetails()) return;

  const paymentData = {
    cardHolderName: document.getElementById("cardHolderName").value.trim(),
    cardNumber: document.getElementById("cardNumber").value.replace(/\s/g, ''),
    expiryDate: document.getElementById("expiryDate").value,
    cvv: document.getElementById("cvv").value
  };

  try {
    await setDoc(doc(db, "Payments", currentBookingId), {
      bookingID: currentBookingId,
      guestID: auth.currentUser.uid,
      ...paymentData,
      timestamp: new Date()
    });
    
    alert("Payment successful!");
    bankDetailsModal.style.display = "none";
    window.location.href = "profile";
  } catch (error) {
    console.error("Payment failed:", error);
    alert("Payment failed: " + error.message);
  }
});

async function getFullyBookedDates(roomType) {
  const fullyBookedDates = [];
  // Filter for available rooms only
  const roomsQuery = query(
    collection(db, "Room"),
    where("type", "==", roomType),
    where("status", "==", "available")
  );
  const roomsSnapshot = await getDocs(roomsQuery);
  const roomIds = roomsSnapshot.docs.map(doc => doc.id);
  const bookedDatesMap = new Map();

  for (const roomId of roomIds) {
    const bookingsQuery = query(collection(db, "Booking"), where("roomID", "==", roomId));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookedDates = [];
    for (const bookingDoc of bookingsSnapshot.docs) {
      const bookingData = bookingDoc.data();
      const startDate = new Date(bookingData.checkInDate);
      const endDate = new Date(bookingData.checkOutDate);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        bookedDates.push(new Date(d).toISOString().split('T')[0]);
      }
    }
    bookedDatesMap.set(roomId, bookedDates);
  }

  if (roomIds.length > 0) {
    const allDates = [...new Set([...bookedDatesMap.values()].flat())];
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
  const roomsQuery = query(collection(db, "Room"), where("type", "==", roomType));
  const roomsSnapshot = await getDocs(roomsQuery);

  for (const roomDoc of roomsSnapshot.docs) {
    const roomId = roomDoc.id;
    const isAvailable = await isRoomAvailable(roomId, startDate, endDate);
    if (isAvailable) {
      return roomId;
    }
  }
  return null;
}

async function isRoomAvailable(roomId, startDate, endDate) {
  const bookingsQuery = query(collection(db, "Booking"), where("roomID", "==", roomId));
  const bookingsSnapshot = await getDocs(bookingsQuery);

  for (const bookingDoc of bookingsSnapshot.docs) {
    const bookingData = bookingDoc.data();
    const bookingStart = new Date(bookingData.checkInDate);
    const bookingEnd = new Date(bookingData.checkOutDate);
    if (
      (startDate >= bookingStart && startDate < bookingEnd) ||
      (endDate > bookingStart && endDate <= bookingEnd) ||
      (startDate <= bookingStart && endDate >= bookingEnd)
    ) {
      return false;
    }
  }
  return true;
}

// Confirm booking handler
confirmBookingBtn?.addEventListener("click", async () => {
  const fpInstance = datePickerInput._flatpickr;
  if (!selectedRoomId || !fpInstance || fpInstance.selectedDates.length !== 2) {
    alert("Please select valid dates first");
    return;
  }

  try {
    const startDate = fpInstance.selectedDates[0];
    const endDate = fpInstance.selectedDates[1];
    const nights = Math.ceil((endDate - startDate) / (1000 * 3600 * 24));
    const totalCost = nights * roomPrice;

    const isAvailable = await isRoomAvailable(selectedRoomId, startDate, endDate);
    if (!isAvailable) {
      alert("Room no longer available");
      return;
    }

    const bookingId = await getNextBookingId();
    const bookingIdStr = `B${bookingId}`;
    currentBookingId = bookingIdStr;

    await setDoc(doc(db, "Booking", bookingIdStr), {
      bookID: bookingIdStr,
      guestID: auth.currentUser.uid,
      roomID: selectedRoomId,
      checkInDate: fpInstance.formatDate(startDate, "Y-m-d"),
      checkOutDate: fpInstance.formatDate(endDate, "Y-m-d"),
      status: "booked",
      total: totalCost,
      timestamp: new Date()
    });

    bankDetailsModal.style.display = "block";
  } catch (error) {
    console.error("Booking failed:", error);
    alert(`Booking failed: ${error.message}`);
  }
});

async function getNextBookingId() {
  const counterRef = doc(db, "Counters", "bookingCounter");
  return runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    if (!counterSnap.exists()) {
      transaction.set(counterRef, { count: 1 });
      return 1;
    }
    const newCount = (counterSnap.data().count || 0) + 1;
    transaction.update(counterRef, { count: newCount });
    return newCount;
  });
}

// Payment handling
submitBankDetailsBtn?.addEventListener("click", async () => {
  const cardHolderName = document.getElementById("cardHolderName").value;
  const cardNumber = document.getElementById("cardNumber").value;
  const expiryDate = document.getElementById("expiryDate").value;
  const cvv = document.getElementById("cvv").value;

  if (!cardHolderName || !cardNumber || !expiryDate || !cvv) {
    alert("Please fill all payment fields");
    return;
  }

  try {
    await setDoc(doc(db, "Payments", currentBookingId), {
      bookingID: currentBookingId,
      guestID: auth.currentUser.uid,
      cardHolderName,
      cardNumber,
      expiryDate,
      cvv,
      timestamp: new Date()
    });
    alert("Payment successful!");
    bankDetailsModal.style.display = "none";
    window.location.href = "profile";
  } catch (error) {
    console.error("Payment failed:", error);
    alert("Payment failed: " + error.message);
  }
});

// Modal controls
closeModalBtn?.addEventListener("click", () => {
  bankDetailsModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === bankDetailsModal) {
    bankDetailsModal.style.display = "none";
  }
});