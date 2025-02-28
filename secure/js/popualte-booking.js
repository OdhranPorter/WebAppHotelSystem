/* File: /js/populate-bookings.js */
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
  const bookingForm = document.getElementById("bookingForm");
  const bookingTableBody = document.querySelector("#bookingTable tbody");

  // CREATE
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const guestID = document.getElementById("booking-guestId").value.trim();
    const roomID = document.getElementById("booking-roomId").value.trim();
    const checkInDate = document.getElementById("booking-checkIn").value;
    const checkOutDate = document.getElementById("booking-checkOut").value;

    // Basic validation
    if (new Date(checkInDate) > new Date(checkOutDate)) {
      alert("Check-out date must be after check-in date!");
      return;
    }

    try {
      await addDoc(collection(db, "Booking"), {
        guestID,
        roomID,
        checkInDate,
        checkOutDate,
        status: "pending",
        createdAt: new Date()
      });
      alert("Booking created!");
      bookingForm.reset();
      loadBookings();
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Could not create booking");
    }
  });

  // READ
  async function loadBookings() {
    bookingTableBody.innerHTML = "";
    const snapshot = await getDocs(collection(db, "Booking"));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${docSnap.id}</td>
        <td>${data.guestID}</td>
        <td>${data.roomID}</td>
        <td>${data.checkInDate}</td>
        <td>${data.checkOutDate}</td>
        <td>${data.status}</td>
        <td>
          <button onclick="editBooking('${docSnap.id}',
                                       '${data.guestID}',
                                       '${data.roomID}',
                                       '${data.checkInDate}',
                                       '${data.checkOutDate}',
                                       '${data.status}')">
            Edit
          </button>
          <button onclick="deleteBooking('${docSnap.id}')">Delete</button>
        </td>
      `;
      bookingTableBody.appendChild(row);
    });
  }

  // UPDATE
  window.editBooking = async (id, oldGuest, oldRoom, oldCheckIn, oldCheckOut, oldStatus) => {
    const newGuest = prompt("New Guest ID:", oldGuest);
    if (!newGuest) return;
    const newRoom = prompt("New Room ID:", oldRoom);
    if (!newRoom) return;
    const newCheckIn = prompt("New Check-In date (YYYY-MM-DD):", oldCheckIn);
    if (!newCheckIn) return;
    const newCheckOut = prompt("New Check-Out date (YYYY-MM-DD):", oldCheckOut);
    if (!newCheckOut) return;
    const newStatus = prompt("New Status:", oldStatus);

    try {
      await updateDoc(doc(db, "Booking", id), {
        guestID: newGuest,
        roomID: newRoom,
        checkInDate: newCheckIn,
        checkOutDate: newCheckOut,
        status: newStatus || "pending"
      });
      alert("Booking updated!");
      loadBookings();
    } catch (err) {
      console.error("Error updating booking:", err);
      alert("Could not update booking");
    }
  };

  // DELETE
  window.deleteBooking = async (id) => {
    try {
      await deleteDoc(doc(db, "Booking", id));
      alert("Booking deleted!");
      loadBookings();
    } catch (err) {
      console.error("Error deleting booking:", err);
      alert("Could not delete booking");
    }
  };

  // Load all bookings initially
  loadBookings();
});
