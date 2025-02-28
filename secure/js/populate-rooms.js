import { db } from "./populate.js";
import {
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const roomForm = document.getElementById("roomForm");
  const roomTableBody = document.querySelector("#roomTable tbody");

  // CREATE using your existing createRoom logic
  roomForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const roomId = document.getElementById("room-id").value.trim();
    const type = document.getElementById("room-type").value.trim();
    const price = document.getElementById("room-price").value;
    const amenitiesString = document.getElementById("room-amenities").value.trim();

    // Use your createRoom function here
    try {
      await createRoom(roomId, type, price, amenitiesString);
      roomForm.reset();
      loadRooms();
    } catch (err) {
      console.error("Error creating room:", err);
    }
  });

  // READ: Load rooms from Firestore
  async function loadAllRooms() {
    roomsTableBody.innerHTML = "";
    const snap = await getDocs(collection(db, "Room"));
    snap.forEach((docSnap) => {
      const r = docSnap.data();
      const row = document.createElement("tr");
      row.dataset.docId = docSnap.id; // store "R101" or whatever
  
      // We'll store the amenities as a comma-separated string
      const amStr = (r.amenities || []).join(", ");
  
      row.innerHTML = `
        <td>${r.id || ""}</td>
        <td>${r.type || ""}</td>
        <td>${r.price || 0}</td>
        <td>${amStr}</td>
        <td>
          <button class="action-btn edit">Edit</button>
          <button class="action-btn delete">Delete</button>
        </td>
      `;
  
      // Edit
      const editBtn = row.querySelector(".edit");
      editBtn.addEventListener("click", () => editRoom(row));
  
      // Delete
      const deleteBtn = row.querySelector(".delete");
      deleteBtn.addEventListener("click", () => deleteRoom(row));
  
      roomsTableBody.appendChild(row);
    });
  }

  // UPDATE: Edit room details
  window.editRoom = async (id, oldRoomId, oldType, oldPrice, oldAmenities) => {
    const newRoomId = prompt("Enter new Room ID:", oldRoomId) || oldRoomId;
    const newType = prompt("Enter new Room Type:", oldType) || oldType;
    const newPrice = parseFloat(prompt("Enter new Price:", oldPrice)) || oldPrice;
    const newAmenities = prompt("Enter new Amenities (comma separated):", oldAmenities) || oldAmenities;
    
    const amenitiesArray = newAmenities.split(",").map(a => a.trim()).filter(a => a !== "");

    try {
      await updateDoc(doc(db, "Room", id), {
        id: newRoomId, // update the id field if needed
        type: newType,
        price: newPrice,
        amenities: amenitiesArray
      });
      alert("Room updated!");
      loadRooms();
    } catch (err) {
      console.error("Error updating room:", err);
      alert("Could not update room");
    }
  };

  // DELETE: Remove room
  window.deleteRoom = async (id) => {
    try {
      await deleteDoc(doc(db, "Room", id));
      alert("Room deleted!");
      loadRooms();
    } catch (err) {
      console.error("Error deleting room:", err);
      alert("Could not delete room");
    }
  };

  // Make sure to load rooms when the page loads
  loadRooms();
});

// Your createRoom function from before:
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
