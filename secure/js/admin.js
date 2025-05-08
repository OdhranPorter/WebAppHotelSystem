// admin.js

// ================================
// 1. Import Firebase Modules
// ================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// ================================
// 2. Configure and Initialize Firebase
// ================================
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

// ================================
// 3. Reference Key DOM Elements
// ================================
const registerEmployeeForm = document.getElementById("registerEmployeeForm");
const employeeTableBody = document.querySelector("#employeeTable tbody");
const guestTableBody = document.querySelector("#guestTable tbody");

const accountDropdown = document.getElementById("accountDropdown");
const accountBtn = document.getElementById("accountBtn");
const accountMenu = document.getElementById("accountMenu");
const logoutBtn = document.getElementById("logoutBtn");
const loginBtn = document.getElementById("loginBtn");

// ================================
// 4. Handle Authentication and Authorisation
// ================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login?from=admin";
    return;
  }

  const empSnap = await getDoc(doc(db, "Employee", user.uid));
  if (!empSnap.exists()) {
    alert("Access denied - not an Employee");
    window.location.href = "home";
    return;
  }

  const empData = empSnap.data();
  if (empData.role !== "admin") {
    alert("Access denied - not an Admin");
    window.location.href = "home";
    return;
  }

  if (accountDropdown) accountDropdown.style.display = "inline-block";
  if (loginBtn) loginBtn.style.display = "none";

  loadAllEmployees();
  loadAllGuests();
});

// ================================
// 5. Toggle Account Menu Display
// ================================
if (accountBtn && accountMenu) {
  accountBtn.addEventListener("click", () => {
    accountMenu.style.display =
      accountMenu.style.display === "block" ? "none" : "block";
  });
}

// ================================
// 6. Handle Logout Functionality
// ================================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "home";
  });
}

// ================================
// 7. Register a New Employee Account
// ================================
if (registerEmployeeForm) {
  registerEmployeeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("emp-name").value.trim();
    const phone = document.getElementById("emp-phone").value.trim();
    const email = document.getElementById("emp-email").value.trim();
    const password = document.getElementById("emp-password").value.trim();
    const role = document.getElementById("emp-role").value.trim();

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = cred.user;

      await setDoc(doc(db, "Employee", newUser.uid), {
        name,
        phone,
        email,
        password,
        role,
        empId: Date.now()
      });

      alert("Employee created successfully!");
      registerEmployeeForm.reset();
      loadAllEmployees();
    } catch (err) {
      console.error("Error creating employee:", err);
      alert(err.message);
    }
  });
}

// ================================
// 8. Load and Display All Non-Admin Employees
// ================================
async function loadAllEmployees() {
  employeeTableBody.innerHTML = "";

  const snap = await getDocs(collection(db, "Employee"));
  snap.forEach((docSnap) => {
    const emp = docSnap.data();
    if (emp.role === "admin") return;

    const row = document.createElement("tr");
    row.dataset.docId = docSnap.id;

    row.innerHTML = `
      <td>${emp.name || ""}</td>
      <td>${emp.email || ""}</td>
      <td>${emp.phone || ""}</td>
      <td>${emp.role || ""}</td>
      <td>${emp.empId || ""}</td>
      <td>
        <button class="action-btn edit">Edit</button>
        <button class="action-btn delete">Delete</button>
      </td>
    `;

    const editBtn = row.querySelector(".edit");
    editBtn.addEventListener("click", () => editEmployee(row));

    const deleteBtn = row.querySelector(".delete");
    deleteBtn.addEventListener("click", () => deleteEmployee(row));

    employeeTableBody.appendChild(row);
  });
}

// ================================
// 9. Load and Display All Guests
// ================================
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
    `;

    guestTableBody.appendChild(row);
  });
}

// ================================
// 10. Edit Employee Entry
// ================================
function editEmployee(row) {
  const docId = row.dataset.docId;
  const cells = row.querySelectorAll("td");

  const name = cells[0].textContent;
  const email = cells[1].textContent;
  const phone = cells[2].textContent;
  const role = cells[3].textContent;

  cells[0].innerHTML = `<input type="text" value="${name}">`;
  cells[1].innerHTML = `<input type="email" value="${email}">`;
  cells[2].innerHTML = `<input type="text" value="${phone}">`;
  cells[3].innerHTML = `<input type="text" value="${role}">`;

  const actionCell = cells[5];
  actionCell.innerHTML = `
    <button class="action-btn save">Save</button>
    <button class="action-btn cancel">Cancel</button>
  `;

  actionCell.querySelector(".save").addEventListener("click", async () => {
    const newName = cells[0].querySelector("input").value.trim();
    const newEmail = cells[1].querySelector("input").value.trim();
    const newPhone = cells[2].querySelector("input").value.trim();
    const newRole = cells[3].querySelector("input").value.trim();

    try {
      await updateDoc(doc(db, "Employee", docId), {
        name: newName,
        email: newEmail,
        phone: newPhone,
        role: newRole
      });
      loadAllEmployees();
    } catch (error) {
      alert("Failed to update employee: " + error.message);
    }
  });

  actionCell.querySelector(".cancel").addEventListener("click", () => {
    loadAllEmployees();
  });
}

// ================================
// 11. Delete Employee Entry
// ================================
async function deleteEmployee(row) {
  const docId = row.dataset.docId;

  if (confirm("Are you sure you want to delete this employee?")) {
    try {
      await deleteDoc(doc(db, "Employee", docId));
      loadAllEmployees();
    } catch (error) {
      alert("Failed to delete employee: " + error.message);
    }
  }
}
