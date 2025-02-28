/* File: /js/populate-employees.js */
import { db } from "./populate.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const employeeForm = document.getElementById("employeeForm");
  const employeeTableBody = document.querySelector("#employeeTable tbody");

  // CREATE
  employeeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("emp-name").value.trim();
    const phone = document.getElementById("emp-phone").value.trim();
    const email = document.getElementById("emp-email").value.trim();
    const password = document.getElementById("emp-password").value.trim();
    const role = document.getElementById("emp-role").value.trim();

    try {
      await addDoc(collection(db, "Employee"), {
        name, phone, email, password, role,
        createdAt: new Date()
      });
      alert("Employee created!");
      employeeForm.reset();
      loadEmployees();
    } catch (err) {
      console.error("Error creating employee:", err);
      alert("Could not create employee");
    }
  });

  // READ
  async function loadEmployees() {
    employeeTableBody.innerHTML = "";
    const snapshot = await getDocs(collection(db, "Employee"));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.name}</td>
        <td>${data.phone}</td>
        <td>${data.email}</td>
        <td>${data.role}</td>
        <td>
          <button onclick="editEmployee('${docSnap.id}',
                                        '${data.name}',
                                        '${data.phone}',
                                        '${data.email}',
                                        '${data.role}')">
            Edit
          </button>
          <button onclick="deleteEmployee('${docSnap.id}')">Delete</button>
        </td>
      `;
      employeeTableBody.appendChild(row);
    });
  }

  // UPDATE
  window.editEmployee = async (id, oldName, oldPhone, oldEmail, oldRole) => {
    const newName = prompt("New name:", oldName);
    if (!newName) return;
    const newPhone = prompt("New phone:", oldPhone);
    if (!newPhone) return;
    const newEmail = prompt("New email:", oldEmail);
    if (!newEmail) return;
    const newRole = prompt("New role:", oldRole);
    if (!newRole) return;

    try {
      await updateDoc(doc(db, "Employee", id), {
        name: newName,
        phone: newPhone,
        email: newEmail,
        role: newRole
      });
      alert("Employee updated!");
      loadEmployees();
    } catch (err) {
      console.error("Error updating employee:", err);
      alert("Could not update employee");
    }
  };

  // DELETE
  window.deleteEmployee = async (id) => {
    try {
      await deleteDoc(doc(db, "Employee", id));
      alert("Employee deleted!");
      loadEmployees();
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert("Could not delete employee");
    }
  };

  // Load employees on page load
  loadEmployees();
});
