// admin.js

import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
  
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
  
  // 1. Firebase init
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
  const db   = getFirestore(app);
  
  // 2. DOM references
  const registerEmployeeForm = document.getElementById("registerEmployeeForm");
  const employeeTableBody    = document.querySelector("#employeeTable tbody");
  const guestTableBody       = document.querySelector("#guestTable tbody");
  
  const accountDropdown = document.getElementById("accountDropdown");
  const accountBtn      = document.getElementById("accountBtn");
  const accountMenu     = document.getElementById("accountMenu");
  const logoutBtn       = document.getElementById("logoutBtn");
  const loginBtn        = document.getElementById("loginBtn");
  
  // 3. onAuthStateChanged => Ensure admin
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in => go to login
      window.location.href = "login.html?from=admin.html";
      return;
    }
  
    // Check if user is truly admin
    const empSnap = await getDoc(doc(db, "Employee", user.uid));
    if (!empSnap.exists()) {
      alert("Access denied - not an Employee");
      window.location.href = "home.html";
      return;
    }
    const empData = empSnap.data();
    if (empData.role !== "admin") {
      alert("Access denied - not an Admin");
      window.location.href = "home.html";
      return;
    }
  
    // If here => user is admin
    if (accountDropdown) accountDropdown.style.display = "inline-block";
    if (loginBtn)        loginBtn.style.display = "none";
  
    loadAllEmployees();
    loadAllGuests();
  });
  
  // 4. Toggle account menu
  if (accountBtn && accountMenu) {
    accountBtn.addEventListener("click", () => {
      accountMenu.style.display = (accountMenu.style.display === "block") ? "none" : "block";
    });
  }
  
  // 5. Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "home.html";
    });
  }
  
  // 6. Register new Employee
  if (registerEmployeeForm) {
    registerEmployeeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const name     = document.getElementById("emp-name").value.trim();
      const phone    = document.getElementById("emp-phone").value.trim();
      const email    = document.getElementById("emp-email").value.trim();
      const password = document.getElementById("emp-password").value.trim();
      const role     = document.getElementById("emp-role").value.trim();
  
      try {
        // Create user in Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = cred.user;
  
        // Store doc in "Employee"
        await setDoc(doc(db, "Employee", newUser.uid), {
          name,
          phone,
          email,
          password, // demonstration only
          role,
          empId: Date.now() // or a real approach
        });
  
        alert("Employee created successfully!");
        registerEmployeeForm.reset();
        loadAllEmployees(); // refresh table
      } catch (err) {
        console.error("Error creating employee:", err);
        alert(err.message);
      }
    });
  }
  
  // 7. Load Employees (skip admins)
  async function loadAllEmployees() {
    employeeTableBody.innerHTML = "";
    const snap = await getDocs(collection(db, "Employee"));
    snap.forEach((docSnap) => {
      const emp = docSnap.data();
      if (emp.role === "admin") return; // skip admin
  
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
  
  // 8. Load Guests
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
  
  // 9. Edit => only name(cell0) and role(cell3)
  function editEmployee(row) {
    const docId = row.dataset.docId;
    const nameCell = row.cells[0];
    const roleCell = row.cells[3];
  
    const currentName = nameCell.innerText;
    const currentRole = roleCell.innerText;
  
    // Convert text to input
    nameCell.innerHTML = `<input type="text" value="${currentName}" />`;
    roleCell.innerHTML = `<input type="text" value="${currentRole}" />`;
  
    // Switch button to Save
    const editBtn = row.querySelector(".edit");
    editBtn.textContent = "Save";
  
    // Re-wire the event
    editBtn.replaceWith(editBtn.cloneNode(true));
    const newEditBtn = row.querySelector(".edit");
    newEditBtn.addEventListener("click", () => saveEmployeeEdits(row));
  }
  
  // 10. Save => update doc
  async function saveEmployeeEdits(row) {
    const docId = row.dataset.docId;
    const nameCell = row.cells[0];
    const roleCell = row.cells[3];
  
    const newName = nameCell.querySelector("input").value.trim();
    const newRole = roleCell.querySelector("input").value.trim();
  
    try {
      await updateDoc(doc(db, "Employee", docId), {
        name: newName,
        role: newRole
      });
  
      // revert to text
      nameCell.innerHTML = newName;
      roleCell.innerHTML = newRole;
  
      const editBtn = row.querySelector(".edit");
      editBtn.textContent = "Edit";
      editBtn.replaceWith(editBtn.cloneNode(true));
      const restoredBtn = row.querySelector(".edit");
      restoredBtn.addEventListener("click", () => editEmployee(row));
  
      alert("Employee updated successfully!");
    } catch (err) {
      console.error("Error updating employee:", err);
      alert(err.message);
    }
  }
  
  // 11. Delete => remove doc
  async function deleteEmployee(row) {
    const docId = row.dataset.docId;
    if (!confirm("Are you sure you want to delete this employee?")) return;
  
    try {
      await deleteDoc(doc(db, "Employee", docId));
      row.remove();
      alert("Employee deleted successfully.");
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert(err.message);
    }
  }
  