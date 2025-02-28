import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// Firebase configuration and initialization
const firebaseConfig = {
  apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
  authDomain: "hotel-booking-3aad3.firebaseapp.com",
  projectId: "hotel-booking-3aad3",
  storageBucket: "hotel-booking-3aad3.firbasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM reference
const guestTableBody = document.querySelector("#guestTable tbody");

// Auth state listener for admin validation
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login?from=admin";
    return;
  }

  const empSnap = await getDoc(doc(db, "Employee", user.uid));
  if (!empSnap.exists() || empSnap.data().role !== "admin") {
    window.location.href = "home";
    return;
  }

  loadAllGuests();
});

// Load Guests function
async function loadAllGuests() {
  guestTableBody.innerHTML = "";
  const snap = await getDocs(collection(db, "Guest"));
  snap.forEach((docSnap) => {
    const g = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${g.fName || ""}</td>
      <td>${g.sName || ""}</td>
      <td>${g.email || ""}</td>
      <td>${g.phoneNum || ""}</td>
      <td>
      <button class="action-btn edit">Edit</button>
      <button class="action-btn delete">Delete</button>
    </td>
  `;

  // Edit
  const editBtn = row.querySelector(".edit");
  editBtn.addEventListener("click", () => editGuest(row));

  // Delete
  const deleteBtn = row.querySelector(".delete");
  deleteBtn.addEventListener("click", () => deleteGuest(row));

  guestTableBody.appendChild(row);
});
}

// EDIT: Update guest information
window.editGuest = async (id, oldFName, oldSName, oldEmail, oldPhoneNum) => {
  const newFName = prompt("Enter new First Name:", oldFName) || oldFName;
  const newSName = prompt("Enter new Last Name:", oldSName) || oldSName;
  const newEmail = prompt("Enter new Email:", oldEmail) || oldEmail;
  const newPhoneNum = prompt("Enter new Phone Number:", oldPhoneNum) || oldPhoneNum;

  try {
    await updateDoc(doc(db, "Guest", id), {
      fName: newFName,
      sName: newSName,
      email: newEmail,
      phoneNum: newPhoneNum
    });
    alert("Guest updated!");
    loadAllGuests();
  } catch (err) {
    console.error("Error updating guest:", err);
    alert("Could not update guest");
  }
};

// DELETE: Remove guest
window.deleteGuest = async (id) => {
  if (confirm("Are you sure you want to delete this guest?")) {
    try {
      await deleteDoc(doc(db, "Guest", id));
      alert("Guest deleted!");
      loadAllGuests();
    } catch (err) {
      console.error("Error deleting guest:", err);
      alert("Could not delete guest");
    }
  }
};