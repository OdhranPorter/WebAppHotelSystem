/***************************************************
 * 1. IMPORTS & FIREBASE CONFIG
 ***************************************************/
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  runTransaction,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// REPLACE with your actual config or keep consistent with booking.js:
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

/***************************************************
 * HELPER: GENERATE DATE RANGE
 ***************************************************/
// Creates an array of date strings YYYY-MM-DD from start to end inclusive.
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

/***************************************************
 * 2. HELPER: GET NEXT EMPLOYEE ID
 ***************************************************/
async function getNextEmployeeId() {
  const counterRef = doc(db, "Counters", "employeeCounter");
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

/***************************************************
 * 3. REGISTER GUEST
 ***************************************************/
async function registerGuest(fName, sName, email, phone, password, role) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "Guest", user.uid), {
      fName,
      sName,
      email,
      phoneNum: phone,
      password, // storing for demo; in production, do not store plaintext
      role
    });
    alert(`Guest registered successfully! UID: ${user.uid}`);
  } catch (err) {
    console.error("Error creating guest:", err);
    alert(`Error: ${err.message}`);
  }
}

/***************************************************
 * 4. REGISTER EMPLOYEE
 ***************************************************/
async function registerEmployee(name, phone, email, password, role) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const empId = await getNextEmployeeId();
    await setDoc(doc(db, "Employee", user.uid), {
      name,
      phone,
      email,
      password,
      role,
      empId
    });
    alert(`Employee registered successfully! UID: ${user.uid}, empId: ${empId}`);
  } catch (err) {
    console.error("Error creating employee:", err);
    alert(`Error: ${err.message}`);
  }
}

/***************************************************
 * 5. CREATE ROOM
 ***************************************************/
async function createRoom(roomId, type, price, amenitiesString) {
  try {
    const amenitiesArray = amenitiesString
      .split(",")
      .map(a => a.trim())
      .filter(a => a !== "");

    await setDoc(doc(db, "Room", roomId), {
      id: roomId,
      type,
      price: parseFloat(price),
      bookedDates: [],
      amenities: amenitiesArray
    });
    alert(`Room "${roomId}" created successfully!`);
  } catch (err) {
    console.error("Error creating room:", err);
    alert(`Error: ${err.message}`);
  }
}

/***************************************************
 * 3b. CREATE BOOKING (NEW)
 ***************************************************/
// We'll keep a separate "bookingCounter" doc in "Counters/bookingCounter" for auto-increment
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

async function createBooking(roomId, guestId, checkInStr, checkOutStr) {
  const startDate = new Date(checkInStr);
  const endDate   = new Date(checkOutStr);

  if (isNaN(startDate) || isNaN(endDate)) {
    throw new Error("Invalid check-in or check-out date.");
  }
  if (startDate > endDate) {
    throw new Error("Check-out must be after check-in date.");
  }

  // 1) Get the new booking number
  const bookingNum = await getNextBookingId();
  const bookingIdStr = `B${bookingNum}`;

  // 2) Store the booking doc
  await setDoc(doc(db, "Booking", bookingIdStr), {
    bookID: bookingIdStr,
    guestID: guestId,
    roomID: roomId,
    checkInDate: checkInStr,
    checkOutDate: checkOutStr,
    status: "pending"
  });

  // 3) Mark these dates as booked in the room
  const allDates = generateDateRange(startDate, endDate);
  await updateDoc(doc(db, "Room", roomId), {
    bookedDates: arrayUnion(...allDates)
  });

  alert(`Booking ${bookingIdStr} created successfully!`);
}

/***************************************************
 * 6. DELETE & HELPER FUNCTIONS
 ***************************************************/

/**
 * Delete all Bookings that reference a specific Guest UID.
 */
async function deleteBookingsForGuest(guestUid) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("guestID", "==", guestUid));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

/**
 * Delete all Bookings referencing a specific Employee UID (if stored).
 */
async function deleteBookingsForEmployeeUid(employeeUid) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("employeeID", "==", employeeUid));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

/**
 * Delete all Bookings referencing a specific Room ID.
 */
async function deleteBookingsForRoom(roomId) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("roomID", "==", roomId));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

/**
 * Delete an Employee doc by searching for "empId" in Firestore.
 */
async function deleteEmployeeByEmpId(empIdStr) {
  const empIdNum = parseInt(empIdStr);
  if (isNaN(empIdNum)) {
    throw new Error("empId must be a valid integer");
  }

  const employeesRef = collection(db, "Employee");
  const q = query(employeesRef, where("empId", "==", empIdNum));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error(`No employee found with empId = ${empIdNum}`);
  }
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, "Employee", docSnap.id));
    await deleteBookingsForEmployeeUid(docSnap.id);
  }
}

// NEW: Helper to remove booking’s dates from the associated room
async function removeBookingDatesFromRoom(bookingDoc) {
  const bookingData = bookingDoc.data();
  if (!bookingData) return;

  const roomId     = bookingData.roomID;
  const checkInStr = bookingData.checkInDate;
  const checkOutStr= bookingData.checkOutDate;

  const startDate = new Date(checkInStr);
  const endDate   = new Date(checkOutStr);
  if (isNaN(startDate) || isNaN(endDate)) return;

  const allDates  = generateDateRange(startDate, endDate);
  // Remove from Room's bookedDates
  await updateDoc(doc(db, "Room", roomId), {
    bookedDates: arrayRemove(...allDates)
  });
}

/***************************************************
 * 7. UNIFIED DELETE
 ***************************************************/
async function deleteItem(itemType, itemId) {
  if (!itemId) {
    throw new Error("No ID provided for deletion");
  }

  switch (itemType) {
    case "guestUid": {
      // Guest doc
      await deleteDoc(doc(db, "Guest", itemId));
      await deleteBookingsForGuest(itemId);
      alert(`Deleted Guest UID=${itemId} + associated bookings`);
      break;
    }
    case "employeeUid": {
      // Employee doc
      await deleteDoc(doc(db, "Employee", itemId));
      await deleteBookingsForEmployeeUid(itemId);
      alert(`Deleted Employee UID=${itemId} + associated bookings`);
      break;
    }
    case "employeeEmpId": {
      // Employee by empId
      await deleteEmployeeByEmpId(itemId);
      alert(`Deleted Employee with empId=${itemId} + associated bookings`);
      break;
    }
    case "roomId": {
      // Room doc
      await deleteDoc(doc(db, "Room", itemId));
      await deleteBookingsForRoom(itemId);
      alert(`Deleted Room ID=${itemId} + associated bookings`);
      break;
    }
    // NEW: Delete Booking by bookingId
    case "bookingId": {
      const bookingRef = doc(db, "Booking", itemId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error(`No Booking found with ID=${itemId}`);
      }
      // Free the dates in the associated room
      await removeBookingDatesFromRoom(bookingSnap);
      // Delete the booking doc
      await deleteDoc(bookingRef);
      alert(`Deleted Booking ${itemId} and freed those dates in Room`);
      break;
    }
    default:
      throw new Error("Unknown itemType selected");
  }
}

/***************************************************
 * 8. EDIT HELPER FUNCS
 ***************************************************/
async function findEmployeeByEmpId(empIdStr) {
  const empIdNum = parseInt(empIdStr);
  if (isNaN(empIdNum)) {
    throw new Error("empId must be an integer");
  }
  const employeesRef = collection(db, "Employee");
  const q = query(employeesRef, where("empId", "==", empIdNum));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error(`No employee found with empId=${empIdNum}`);
  }
  const docSnap = snap.docs[0];
  return { docId: docSnap.id, data: docSnap.data() };
}

/***************************************************
 * 9. UNIFIED FETCH (for editing)
 ***************************************************/
async function fetchItemForEdit(itemType, itemId) {
  switch (itemType) {
    case "guestUid": {
      const snap = await getDoc(doc(db, "Guest", itemId));
      if (!snap.exists()) {
        throw new Error(`No Guest found with UID=${itemId}`);
      }
      return { docId: itemId, data: snap.data() };
    }
    case "employeeUid": {
      const snap = await getDoc(doc(db, "Employee", itemId));
      if (!snap.exists()) {
        throw new Error(`No Employee found with UID=${itemId}`);
      }
      return { docId: itemId, data: snap.data() };
    }
    case "employeeEmpId": {
      const emp = await findEmployeeByEmpId(itemId);
      return emp; // { docId, data }
    }
    case "roomId": {
      const snap = await getDoc(doc(db, "Room", itemId));
      if (!snap.exists()) {
        throw new Error(`No Room found with ID=${itemId}`);
      }
      return { docId: itemId, data: snap.data() };
    }
    // NEW: bookingId
    case "bookingId": {
      const snap = await getDoc(doc(db, "Booking", itemId));
      if (!snap.exists()) {
        throw new Error(`No Booking found with ID=${itemId}`);
      }
      return { docId: itemId, data: snap.data() };
    }
    default:
      throw new Error("Unknown itemType for editing");
  }
}

/***************************************************
 * 9b. EDIT BOOKING HELPER
 ***************************************************/
// If user changes checkInDate, checkOutDate, or roomID, we must remove old booking
// dates from the old room and add new booking dates to the new room.
async function updateBookingDates(docId, oldData, newData) {
  const oldRoomId     = oldData.roomID;
  const oldCheckInStr = oldData.checkInDate;
  const oldCheckOutStr= oldData.checkOutDate;

  // If not provided, we use old data
  const newRoomId     = newData.roomID || oldRoomId;
  const newCheckInStr = newData.checkInDate || oldCheckInStr;
  const newCheckOutStr= newData.checkOutDate || oldCheckOutStr;

  // If anything changed in date range or room, remove the old range from the old room:
  if (oldRoomId && oldCheckInStr && oldCheckOutStr) {
    const oldStart = new Date(oldCheckInStr);
    const oldEnd   = new Date(oldCheckOutStr);
    if (!isNaN(oldStart) && !isNaN(oldEnd)) {
      const oldDates = generateDateRange(oldStart, oldEnd);
      await updateDoc(doc(db, "Room", oldRoomId), {
        bookedDates: arrayRemove(...oldDates)
      });
    }
  }

  // Then add the new range to the new room
  if (newRoomId && newCheckInStr && newCheckOutStr) {
    const newStart = new Date(newCheckInStr);
    const newEnd   = new Date(newCheckOutStr);
    if (!isNaN(newStart) && !isNaN(newEnd)) {
      const newDates = generateDateRange(newStart, newEnd);
      await updateDoc(doc(db, "Room", newRoomId), {
        bookedDates: arrayUnion(...newDates)
      });
    }
  }
}

/***************************************************
 * 9c. UNIFIED UPDATE
 ***************************************************/
async function updateItem(itemType, docId, newData) {
  let collectionName = "";
  if (itemType.startsWith("guest")) {
    collectionName = "Guest";
  } else if (itemType.startsWith("employee")) {
    collectionName = "Employee";
  } else if (itemType.startsWith("room")) {
    collectionName = "Room";
  } else if (itemType === "bookingId") {
    collectionName = "Booking";
  } else {
    throw new Error("Cannot determine collection from itemType");
  }

  if (collectionName === "Booking") {
    // 1) Get old booking data
    const docSnap = await getDoc(doc(db, "Booking", docId));
    if (!docSnap.exists()) {
      throw new Error(`No booking doc found with ID=${docId}`);
    }
    const oldData = docSnap.data();

    // 2) If user changed the room or dates, we remove old date range from old room
    //    and add the new date range to the new room
    await updateBookingDates(docId, oldData, newData);

    // 3) Update the Booking doc itself
    await updateDoc(doc(db, "Booking", docId), newData);
    return;
  }

  // Otherwise, for Guest / Employee / Room:
  const ref = doc(db, collectionName, docId);
  await updateDoc(ref, newData);
}

/***************************************************
 * 10. DOMContentLoaded - Main
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("populate.js loaded");

  // GUEST
  const guestForm = document.getElementById("guestForm");
  if (guestForm) {
    guestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fName = document.getElementById("guest-fName").value.trim();
      const sName = document.getElementById("guest-sName").value.trim();
      const email = document.getElementById("guest-email").value.trim();
      const phone = document.getElementById("guest-phone").value.trim();
      const password = document.getElementById("guest-password").value.trim();
      const role = document.getElementById("guest-role").value.trim();
      await registerGuest(fName, sName, email, phone, password, role);
      guestForm.reset();
    });
  }

  // EMPLOYEE
  const employeeForm = document.getElementById("employeeForm");
  if (employeeForm) {
    employeeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("emp-name").value.trim();
      const phone = document.getElementById("emp-phone").value.trim();
      const email = document.getElementById("emp-email").value.trim();
      const password = document.getElementById("emp-password").value.trim();
      const role = document.getElementById("emp-role").value.trim();
      await registerEmployee(name, phone, email, password, role);
      employeeForm.reset();
    });
  }

  // ROOM
  const roomForm = document.getElementById("roomForm");
  if (roomForm) {
    roomForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = document.getElementById("room-type").value.trim();
      const price = document.getElementById("room-price").value.trim();
      const roomId = document.getElementById("room-id").value.trim();
      const amenitiesStr = document.getElementById("room-amenities").value.trim();
      await createRoom(roomId, type, price, amenitiesStr);
      roomForm.reset();
    });
  }

  // BOOKING (NEW)
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const roomId      = document.getElementById("booking-roomId").value.trim();
      const guestId     = document.getElementById("booking-guestId").value.trim();
      const checkInDate = document.getElementById("booking-checkIn").value;
      const checkOutDate= document.getElementById("booking-checkOut").value;
      try {
        await createBooking(roomId, guestId, checkInDate, checkOutDate);
        bookingForm.reset();
      } catch (err) {
        console.error("Error creating booking:", err);
        alert(err.message);
      }
    });
  }

  // UNIFIED DELETE
  const deleteTypeSelect = document.getElementById("deleteTypeSelect");
  const deleteIdInput = document.getElementById("deleteIdInput");
  const deleteItemBtn = document.getElementById("deleteItemBtn");
  if (deleteItemBtn) {
    deleteItemBtn.addEventListener("click", async () => {
      const itemType = deleteTypeSelect.value;
      const itemId = deleteIdInput.value.trim();
      if (!itemId) {
        alert("Enter an ID/UID to delete");
        return;
      }
      try {
        await deleteItem(itemType, itemId);
        deleteIdInput.value = "";
      } catch (err) {
        console.error("Delete error:", err);
        alert(err.message);
      }
    });
  }

  // UNIFIED EDIT
  const editTypeSelect = document.getElementById("editTypeSelect");
  const editIdInput = document.getElementById("editIdInput");
  const fetchItemBtn = document.getElementById("fetchItemBtn");
  const editForm = document.getElementById("editForm");
  const updateItemBtn = document.getElementById("updateItemBtn");

  // Our sub-fields
  const guestFields = document.getElementById("guestFields");
  const guestEditFName = document.getElementById("guestEditFName");
  const guestEditSName = document.getElementById("guestEditSName");

  const employeeFields = document.getElementById("employeeFields");
  const employeeEditName = document.getElementById("employeeEditName");
  const employeeEditRole = document.getElementById("employeeEditRole");

  const roomFields = document.getElementById("roomFields");
  const roomEditType = document.getElementById("roomEditType");
  const roomEditPrice = document.getElementById("roomEditPrice");
  const roomEditAmenities = document.getElementById("roomEditAmenities");

  // NEW: Booking fields
  const bookingFields = document.getElementById("bookingFields");
  const bookingEditGuestId = document.getElementById("bookingEditGuestId");
  const bookingEditRoomId = document.getElementById("bookingEditRoomId");
  const bookingEditCheckIn = document.getElementById("bookingEditCheckIn");
  const bookingEditCheckOut = document.getElementById("bookingEditCheckOut");
  const bookingEditStatus = document.getElementById("bookingEditStatus");

  let currentDocId = null;
  let currentItemType = null;

  if (fetchItemBtn) {
    fetchItemBtn.addEventListener("click", async () => {
      const itemType = editTypeSelect.value;
      const itemId = editIdInput.value.trim();
      if (!itemId) {
        alert("Enter an ID/UID/empId to fetch");
        return;
      }

      // Hide all fields initially
      guestFields.style.display = "none";
      employeeFields.style.display = "none";
      roomFields.style.display = "none";
      bookingFields.style.display = "none";
      editForm.style.display = "none";

      try {
        const { docId, data } = await fetchItemForEdit(itemType, itemId);
        currentDocId = docId;
        currentItemType = itemType;

        // Show the form
        editForm.style.display = "block";

        if (itemType === "guestUid") {
          // Show guest fields
          guestFields.style.display = "block";
          guestEditFName.value = data.fName || "";
          guestEditSName.value = data.sName || "";
        }
        else if (itemType === "employeeUid" || itemType === "employeeEmpId") {
          // Show employee fields
          employeeFields.style.display = "block";
          employeeEditName.value = data.name || "";
          employeeEditRole.value = data.role || "";
        }
        else if (itemType === "roomId") {
          // Show room fields
          roomFields.style.display = "block";
          roomEditType.value = data.type || "";
          roomEditPrice.value = data.price || 0;
          const am = data.amenities || [];
          roomEditAmenities.value = am.join(", ");
        }
        else if (itemType === "bookingId") {
          // Show booking fields
          bookingFields.style.display = "block";
          bookingEditGuestId.value = data.guestID || "";
          bookingEditRoomId.value = data.roomID || "";
          bookingEditCheckIn.value = data.checkInDate || "";
          bookingEditCheckOut.value = data.checkOutDate || "";
          bookingEditStatus.value = data.status || "";
        }
      } catch (err) {
        console.error("Fetch item error:", err);
        alert(err.message);
      }
    });
  }

  if (updateItemBtn) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentDocId || !currentItemType) {
        alert("No item is currently loaded. Fetch first.");
        return;
      }
      let newData = {};

      if (currentItemType === "guestUid") {
        const fName = guestEditFName.value.trim();
        const sName = guestEditSName.value.trim();
        newData = { fName, sName };
      }
      else if (currentItemType === "employeeUid" || currentItemType === "employeeEmpId") {
        const name = employeeEditName.value.trim();
        const role = employeeEditRole.value.trim();
        newData = { name, role };
      }
      else if (currentItemType === "roomId") {
        const typeVal = roomEditType.value.trim();
        const priceVal = parseFloat(roomEditPrice.value) || 0;
        const amenitiesStr = roomEditAmenities.value.trim();
        const amenitiesArray = amenitiesStr
          .split(",")
          .map(a => a.trim())
          .filter(a => a !== "");
        newData = { type: typeVal, price: priceVal, amenities: amenitiesArray };
      }
      else if (currentItemType === "bookingId") {
        const guestUidVal = bookingEditGuestId.value.trim();
        const roomIdVal   = bookingEditRoomId.value.trim();
        const checkInVal  = bookingEditCheckIn.value;
        const checkOutVal = bookingEditCheckOut.value;
        const statusVal   = bookingEditStatus.value.trim();

        // Only set fields that user actually wants to change:
        newData = {};
        if (guestUidVal) newData.guestID = guestUidVal;
        if (roomIdVal)   newData.roomID = roomIdVal;
        if (checkInVal)  newData.checkInDate = checkInVal;
        if (checkOutVal) newData.checkOutDate = checkOutVal;
        if (statusVal)   newData.status = statusVal;
      }

      try {
        await updateItem(currentItemType, currentDocId, newData);
        alert(`Item updated successfully! (docId=${currentDocId})`);
      } catch (err) {
        console.error("Update error:", err);
        alert(err.message);
      }
    });
  }
});
