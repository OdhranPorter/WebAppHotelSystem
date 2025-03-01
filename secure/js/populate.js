/***************************************************
 * GLOBAL VARIABLES FOR EDITING
 ***************************************************/
let currentDocId = null;
let currentItemType = null;

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

// REPLACE with your actual config
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
  const endDate = new Date(checkOutStr);
  if (isNaN(startDate) || isNaN(endDate)) {
    throw new Error("Invalid check-in or check-out date.");
  }
  if (startDate > endDate) {
    throw new Error("Check-out must be after check-in date.");
  }
  const bookingNum = await getNextBookingId();
  const bookingIdStr = `B${bookingNum}`;
  await setDoc(doc(db, "Booking", bookingIdStr), {
    bookID: bookingIdStr,
    guestID: guestId,
    roomID: roomId,
    checkInDate: checkInStr,
    checkOutDate: checkOutStr,
    status: "pending"
  });
  const allDates = generateDateRange(startDate, endDate);
  await updateDoc(doc(db, "Room", roomId), {
    bookedDates: arrayUnion(...allDates)
  });
  alert(`Booking ${bookingIdStr} created successfully!`);
}

/***************************************************
 * 6. DELETE & HELPER FUNCTIONS
 ***************************************************/
async function deleteBookingsForGuest(guestUid) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("guestID", "==", guestUid));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

async function deleteBookingsForEmployeeUid(employeeUid) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("employeeID", "==", employeeUid));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

async function deleteBookingsForRoom(roomId) {
  const bookingsRef = collection(db, "Booking");
  const q = query(bookingsRef, where("roomID", "==", roomId));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await deleteDoc(docSnap.ref);
  }
}

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

async function removeBookingDatesFromRoom(bookingDoc) {
  const bookingData = bookingDoc.data();
  if (!bookingData) return;
  const roomId = bookingData.roomID;
  const checkInStr = bookingData.checkInDate;
  const checkOutStr = bookingData.checkOutDate;
  const startDate = new Date(checkInStr);
  const endDate = new Date(checkOutStr);
  if (isNaN(startDate) || isNaN(endDate)) return;
  const allDates = generateDateRange(startDate, endDate);
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
      await deleteDoc(doc(db, "Guest", itemId));
      await deleteBookingsForGuest(itemId);
      alert(`Deleted Guest UID=${itemId} + associated bookings`);
      break;
    }
    case "employeeUid": {
      await deleteDoc(doc(db, "Employee", itemId));
      await deleteBookingsForEmployeeUid(itemId);
      alert(`Deleted Employee UID=${itemId} + associated bookings`);
      break;
    }
    case "employeeEmpId": {
      await deleteEmployeeByEmpId(itemId);
      alert(`Deleted Employee with empId=${itemId} + associated bookings`);
      break;
    }
    case "roomId": {
      await deleteDoc(doc(db, "Room", itemId));
      await deleteBookingsForRoom(itemId);
      alert(`Deleted Room ID=${itemId} + associated bookings`);
      break;
    }
    case "bookingId": {
      const bookingRef = doc(db, "Booking", itemId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error(`No Booking found with ID=${itemId}`);
      }
      await removeBookingDatesFromRoom(bookingSnap);
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
      return emp;
    }
    case "roomId": {
      const snap = await getDoc(doc(db, "Room", itemId));
      if (!snap.exists()) {
        throw new Error(`No Room found with ID=${itemId}`);
      }
      return { docId: itemId, data: snap.data() };
    }
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
async function updateBookingDates(docId, oldData, newData) {
  const oldRoomId = oldData.roomID;
  const oldCheckInStr = oldData.checkInDate;
  const oldCheckOutStr = oldData.checkOutDate;
  const newRoomId = newData.roomID || oldRoomId;
  const newCheckInStr = newData.checkInDate || oldCheckInStr;
  const newCheckOutStr = newData.checkOutDate || oldCheckOutStr;
  if (oldRoomId && oldCheckInStr && oldCheckOutStr) {
    const oldStart = new Date(oldCheckInStr);
    const oldEnd = new Date(oldCheckOutStr);
    if (!isNaN(oldStart) && !isNaN(oldEnd)) {
      const oldDates = generateDateRange(oldStart, oldEnd);
      await updateDoc(doc(db, "Room", oldRoomId), {
        bookedDates: arrayRemove(...oldDates)
      });
    }
  }
  if (newRoomId && newCheckInStr && newCheckOutStr) {
    const newStart = new Date(newCheckInStr);
    const newEnd = new Date(newCheckOutStr);
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
    const docSnap = await getDoc(doc(db, "Booking", docId));
    if (!docSnap.exists()) {
      throw new Error(`No booking doc found with ID=${docId}`);
    }
    const oldData = docSnap.data();
    await updateBookingDates(docId, oldData, newData);
    await updateDoc(doc(db, "Booking", docId), newData);
    return;
  }
  const ref = doc(db, collectionName, docId);
  await updateDoc(ref, newData);
}

/***************************************************
 * FUNCTION: INLINE EDIT GUEST ROW
 ***************************************************/
function inlineEditGuest(uid, guest, row) {
  const attributes = ["email", "fName", "sName", "password", "phoneNum", "role"];
  for (let i = 0; i < attributes.length; i++) {
    const cell = row.cells[i];
    const input = document.createElement("input");
    input.type = "text";
    input.value = guest[attributes[i]] || "";
    cell.innerHTML = "";
    cell.appendChild(input);
  }
  const actionsCell = row.cells[attributes.length];
  actionsCell.innerHTML = "";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const newData = {};
    for (let i = 0; i < attributes.length; i++) {
      const cell = row.cells[i];
      const input = cell.querySelector("input");
      newData[attributes[i]] = input.value;
    }
    try {
      await updateItem("guestUid", uid, newData);
      alert("Guest updated successfully.");
      loadGuests();
    } catch (error) {
      console.error("Error saving inline edit:", error);
      alert("Error saving changes: " + error.message);
    }
  });
  actionsCell.appendChild(saveBtn);
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    loadGuests();
  });
  actionsCell.appendChild(cancelBtn);
}

/***************************************************
 * FUNCTION: LOAD GUESTS
 ***************************************************/
async function loadGuests() {
  const guestListDiv = document.getElementById("guest-list");
  guestListDiv.innerHTML = "";
  try {
    const querySnapshot = await getDocs(collection(db, "Guest"));
    if (querySnapshot.empty) {
      guestListDiv.innerHTML = "<p>No guests found.</p>";
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Email", "First Name", "Last Name", "Password", "Phone", "Role", "Actions"];
    headers.forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    querySnapshot.forEach(docSnap => {
      const guest = docSnap.data();
      const uid = docSnap.id;
      const row = document.createElement("tr");
      
      const emailCell = document.createElement("td");
      emailCell.textContent = guest.email;
      row.appendChild(emailCell);
      
      const fNameCell = document.createElement("td");
      fNameCell.textContent = guest.fName;
      row.appendChild(fNameCell);
      
      const sNameCell = document.createElement("td");
      sNameCell.textContent = guest.sName;
      row.appendChild(sNameCell);
      
      const passwordCell = document.createElement("td");
      passwordCell.textContent = guest.password;
      row.appendChild(passwordCell);
      
      const phoneCell = document.createElement("td");
      phoneCell.textContent = guest.phoneNum;
      row.appendChild(phoneCell);
      
      const roleCell = document.createElement("td");
      roleCell.textContent = guest.role;
      row.appendChild(roleCell);
      
      const actionsCell = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        inlineEditGuest(uid, guest, row);
      });
      actionsCell.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this guest?")) {
          try {
            await deleteItem("guestUid", uid);
            loadGuests();
          } catch (error) {
            console.error("Error deleting guest:", error);
            alert("Error deleting guest: " + error.message);
          }
        }
      });
      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    guestListDiv.appendChild(table);
  } catch (error) {
    console.error("Error loading guests:", error);
    guestListDiv.innerHTML = "<p>Error loading guest list.</p>";
  }
}

/***************************************************
 * FUNCTION: INLINE EDIT EMPLOYEE ROW
 ***************************************************/
function inlineEditEmployee(uid, employee, row) {
  const attributes = ["email", "empId", "name", "password", "phone", "role"];
  for (let i = 0; i < attributes.length; i++) {
    const cell = row.cells[i];
    const input = document.createElement("input");
    input.type = "text";
    input.value = employee[attributes[i]] || "";
    cell.innerHTML = "";
    cell.appendChild(input);
  }
  const actionsCell = row.cells[attributes.length];
  actionsCell.innerHTML = "";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const newData = {};
    for (let i = 0; i < attributes.length; i++) {
      const cell = row.cells[i];
      const input = cell.querySelector("input");
      newData[attributes[i]] = input.value;
    }
    try {
      await updateItem("employeeUid", uid, newData);
      alert("Employee updated successfully.");
      loadEmployees();
    } catch (error) {
      console.error("Error saving inline edit:", error);
      alert("Error saving changes: " + error.message);
    }
  });
  actionsCell.appendChild(saveBtn);
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    loadEmployees();
  });
  actionsCell.appendChild(cancelBtn);
}

/***************************************************
 * FUNCTION: LOAD EMPLOYEES
 ***************************************************/
async function loadEmployees() {
  const employeeListDiv = document.getElementById("employee-list");
  employeeListDiv.innerHTML = "";
  try {
    const querySnapshot = await getDocs(collection(db, "Employee"));
    if (querySnapshot.empty) {
      employeeListDiv.innerHTML = "<p>No employees found.</p>";
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Email", "empId", "Name", "Password", "Phone", "Role", "Actions"];
    headers.forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    querySnapshot.forEach(docSnap => {
      const employee = docSnap.data();
      const uid = docSnap.id;
      const row = document.createElement("tr");
      
      const emailCell = document.createElement("td");
      emailCell.textContent = employee.email;
      row.appendChild(emailCell);
      
      const empIdCell = document.createElement("td");
      empIdCell.textContent = employee.empId;
      row.appendChild(empIdCell);
      
      const nameCell = document.createElement("td");
      nameCell.textContent = employee.name;
      row.appendChild(nameCell);
      
      const passwordCell = document.createElement("td");
      passwordCell.textContent = employee.password;
      row.appendChild(passwordCell);
      
      const phoneCell = document.createElement("td");
      phoneCell.textContent = employee.phone;
      row.appendChild(phoneCell);
      
      const roleCell = document.createElement("td");
      roleCell.textContent = employee.role;
      row.appendChild(roleCell);
      
      const actionsCell = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        inlineEditEmployee(uid, employee, row);
      });
      actionsCell.appendChild(editBtn);
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this employee?")) {
          try {
            await deleteItem("employeeUid", uid);
            loadEmployees();
          } catch (error) {
            console.error("Error deleting employee:", error);
            alert("Error deleting employee: " + error.message);
          }
        }
      });
      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    employeeListDiv.appendChild(table);
  } catch (error) {
    console.error("Error loading employees:", error);
    employeeListDiv.innerHTML = "<p>Error loading employee list.</p>";
  }
}

/***************************************************
 * FUNCTION: INLINE EDIT ROOM ROW
 * Converts a room row into input boxes for inline editing.
 ***************************************************/
function inlineEditRoom(roomId, room, row) {
  // Attributes in order: id, type, price, amenities, bookedDates
  const attributes = ["id", "type", "price", "amenities", "bookedDates"];
  for (let i = 0; i < attributes.length; i++) {
    const cell = row.cells[i];
    const input = document.createElement("input");
    input.type = "text";
    // For array fields, join them into a comma-separated string
    if (attributes[i] === "amenities" || attributes[i] === "bookedDates") {
      input.value = Array.isArray(room[attributes[i]]) ? room[attributes[i]].join(", ") : room[attributes[i]] || "";
    } else {
      input.value = room[attributes[i]] || "";
    }
    cell.innerHTML = "";
    cell.appendChild(input);
  }
  const actionsCell = row.cells[attributes.length];
  actionsCell.innerHTML = "";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const newData = {};
    for (let i = 0; i < attributes.length; i++) {
      const cell = row.cells[i];
      const input = cell.querySelector("input");
      let value = input.value;
      if (attributes[i] === "price") {
        value = parseFloat(value);
      }
      if (attributes[i] === "amenities" || attributes[i] === "bookedDates") {
        value = value.split(",").map(s => s.trim()).filter(s => s.length > 0);
      }
      newData[attributes[i]] = value;
    }
    try {
      await updateItem("roomId", roomId, newData);
      alert("Room updated successfully.");
      loadRooms();
    } catch (error) {
      console.error("Error saving inline edit:", error);
      alert("Error saving changes: " + error.message);
    }
  });
  actionsCell.appendChild(saveBtn);
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    loadRooms();
  });
  actionsCell.appendChild(cancelBtn);
}

/***************************************************
 * FUNCTION: LOAD ROOMS
 * Queries the "Room" collection and builds a table with inline Edit/Delete.
 ***************************************************/
async function loadRooms() {
  const roomListDiv = document.getElementById("room-list");
  roomListDiv.innerHTML = "";
  try {
    const querySnapshot = await getDocs(collection(db, "Room"));
    if (querySnapshot.empty) {
      roomListDiv.innerHTML = "<p>No rooms found.</p>";
      return;
    }
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["ID", "Type", "Price", "Amenities", "Booked Dates", "Actions"];
    headers.forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    querySnapshot.forEach(docSnap => {
      const room = docSnap.data();
      const roomId = docSnap.id;
      const row = document.createElement("tr");
      
      const idCell = document.createElement("td");
      idCell.textContent = room.id;
      row.appendChild(idCell);
      
      const typeCell = document.createElement("td");
      typeCell.textContent = room.type;
      row.appendChild(typeCell);
      
      const priceCell = document.createElement("td");
      priceCell.textContent = room.price;
      row.appendChild(priceCell);
      
      const amenitiesCell = document.createElement("td");
      amenitiesCell.textContent = Array.isArray(room.amenities) ? room.amenities.join(", ") : room.amenities;
      row.appendChild(amenitiesCell);
      
      const bookedDatesCell = document.createElement("td");
      bookedDatesCell.textContent = Array.isArray(room.bookedDates) ? room.bookedDates.join(", ") : room.bookedDates;
      row.appendChild(bookedDatesCell);
      
      const actionsCell = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        inlineEditRoom(roomId, room, row);
      });
      actionsCell.appendChild(editBtn);
      
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this room?")) {
          try {
            await deleteItem("roomId", roomId);
            loadRooms();
          } catch (error) {
            console.error("Error deleting room:", error);
            alert("Error deleting room: " + error.message);
          }
        }
      });
      actionsCell.appendChild(deleteBtn);
      
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    roomListDiv.appendChild(table);
  } catch (error) {
    console.error("Error loading rooms:", error);
    roomListDiv.innerHTML = "<p>Error loading room list.</p>";
  }
}
/***************************************************
 * FUNCTION: INLINE EDIT BOOKING ROW
 ***************************************************/
function inlineEditBooking(bookingId, booking, row) {
  const attributes = ["bookID", "guestID", "roomID", "checkInDate", "checkOutDate", "status"];
  for (let i = 0; i < attributes.length; i++) {
    const cell = row.cells[i];
    const input = document.createElement("input");
    input.type = "text";
    input.value = booking[attributes[i]] || "";
    cell.innerHTML = "";
    cell.appendChild(input);
  }
  
  const actionsCell = row.cells[attributes.length];
  actionsCell.innerHTML = "";
  
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const newData = {};
    for (let i = 0; i < attributes.length; i++) {
      const cell = row.cells[i];
      const input = cell.querySelector("input");
      newData[attributes[i]] = input.value;
    }
    
    try {
      await updateItem("bookingId", bookingId, newData);
      alert("Booking updated successfully!");
      loadBookings();
    } catch (error) {
      console.error("Error saving booking edit:", error);
      alert("Error saving changes: " + error.message);
    }
  });
  
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => loadBookings());
  
  actionsCell.appendChild(saveBtn);
  actionsCell.appendChild(cancelBtn);
}

/***************************************************
 * FUNCTION: LOAD BOOKINGS
 ***************************************************/
async function loadBookings() {
  const bookingListDiv = document.getElementById("booking-list");
  bookingListDiv.innerHTML = "";
  
  try {
    const querySnapshot = await getDocs(collection(db, "Booking"));
    if (querySnapshot.empty) {
      bookingListDiv.innerHTML = "<p>No bookings found.</p>";
      return;
    }

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Booking ID", "Guest ID", "Room ID", "Check-In", "Check-Out", "Status", "Actions"];
    
    headers.forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    querySnapshot.forEach(docSnap => {
      const booking = docSnap.data();
      const row = document.createElement("tr");
      
      // Booking ID
      const bookIdCell = document.createElement("td");
      bookIdCell.textContent = booking.bookID;
      row.appendChild(bookIdCell);
      
      // Guest ID
      const guestIdCell = document.createElement("td");
      guestIdCell.textContent = booking.guestID;
      row.appendChild(guestIdCell);
      
      // Room ID
      const roomIdCell = document.createElement("td");
      roomIdCell.textContent = booking.roomID;
      row.appendChild(roomIdCell);
      
      // Check-In Date
      const checkInCell = document.createElement("td");
      checkInCell.textContent = booking.checkInDate;
      row.appendChild(checkInCell);
      
      // Check-Out Date
      const checkOutCell = document.createElement("td");
      checkOutCell.textContent = booking.checkOutDate;
      row.appendChild(checkOutCell);
      
      // Status
      const statusCell = document.createElement("td");
      statusCell.textContent = booking.status;
      row.appendChild(statusCell);
      
      // Actions
      const actionsCell = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => inlineEditBooking(docSnap.id, booking, row));
      
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this booking?")) {
          try {
            await deleteItem("bookingId", docSnap.id);
            loadBookings();
          } catch (error) {
            alert("Error deleting booking: " + error.message);
          }
        }
      });
      
      actionsCell.appendChild(editBtn);
      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    bookingListDiv.appendChild(table);
  } catch (error) {
    console.error("Error loading bookings:", error);
    bookingListDiv.innerHTML = "<p>Error loading bookings</p>";
  }
}


/***************************************************
 * 10. DOMContentLoaded - Main
 ***************************************************/
document.addEventListener("DOMContentLoaded", () => {
  console.log("populate.js loaded");

  // GUEST FORM HANDLER
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

  // EMPLOYEE FORM HANDLER
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

  // ROOM FORM HANDLER
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

  // BOOKING FORM HANDLER
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const roomId = document.getElementById("booking-roomId").value.trim();
      const guestId = document.getElementById("booking-guestId").value.trim();
      const checkInDate = document.getElementById("booking-checkIn").value;
      const checkOutDate = document.getElementById("booking-checkOut").value;
      try {
        await createBooking(roomId, guestId, checkInDate, checkOutDate);
        bookingForm.reset();
      } catch (err) {
        console.error("Error creating booking:", err);
        alert(err.message);
      }
    });
  }

  // UNIFIED DELETE HANDLER
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

  /***************************************************
   * NAVBAR HANDLING
   ***************************************************/
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('data-target');
      document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(targetId).classList.add('active');
      if (targetId === "guest-section") {
        loadGuests();
      } else if (targetId === "employee-section") {
        loadEmployees();
      } else if (targetId === "room-section") {
        loadRooms();
      }
      if (targetId === "booking-section") {
        loadBookings();
      }
      // Add similar calls for other sections if needed.
    });
  });
});
