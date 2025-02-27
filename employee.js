// employee.js

import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
  
  import {
    getAuth,
    onAuthStateChanged,
    signOut
  } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
  
  import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove
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
  const createRoomForm = document.getElementById("createRoomForm");
  const roomsTableBody = document.querySelector("#roomsTable tbody");
  const bookingsTableBody = document.querySelector("#bookingsTable tbody");
  
  const accountDropdown = document.getElementById("accountDropdown");
  const accountBtn      = document.getElementById("accountBtn");
  const accountMenu     = document.getElementById("accountMenu");
  const logoutBtn       = document.getElementById("logoutBtn");
  const loginBtn        = document.getElementById("loginBtn");
  
  // 3. Auth => must be employee or admin
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Not logged in => redirect
      window.location.href = "login?from=employee";
      return;
    }
    // Check if user has "Employee" doc => if role===employee OR role===admin => allowed
    const empSnap = await getDoc(doc(db, "Employee", user.uid));
    if (!empSnap.exists()) {
      alert("Access denied - not an Employee");
      window.location.href = "home";
      return;
    }
    const empData = empSnap.data();
    if (empData.role !== "employee" && empData.role !== "admin") {
      alert("Access denied - not an Employee or Admin");
      window.location.href = "home";
      return;
    }
  
    // If here => user is employee or admin
    if (accountDropdown) accountDropdown.style.display = "inline-block";
    if (loginBtn)        loginBtn.style.display = "none";
  
    // Load rooms & bookings
    loadAllRooms();
    loadAllBookings();
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
      window.location.href = "home";
    });
  }
  
  // 6. Create Room
  if (createRoomForm) {
    createRoomForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const roomId      = document.getElementById("room-id").value.trim();
      const roomType    = document.getElementById("room-type").value.trim();
      const priceVal    = parseFloat(document.getElementById("room-price").value.trim()) || 0;
      const amenitiesStr= document.getElementById("room-amenities").value.trim();
      
      const amenitiesArr = amenitiesStr ? amenitiesStr.split(",").map(a => a.trim()) : [];
  
      try {
        // Create/overwrite doc in "Room"
        await setDoc(doc(db, "Room", roomId), {
          id: roomId,
          type: roomType,
          price: priceVal,
          bookedDates: [],
          amenities: amenitiesArr
        });
        alert(`Room "${roomId}" created/updated successfully!`);
        createRoomForm.reset();
        loadAllRooms(); // refresh table
      } catch (err) {
        console.error("Error creating room:", err);
        alert(err.message);
      }
    });
  }
  
  // 7. Load All Rooms => fill table
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
  
  // 8. Edit Room => only type, price, and amenities are editable (skip ID/bookedDates)
  function editRoom(row) {
    const docId = row.dataset.docId;
    const typeCell  = row.cells[1];
    const priceCell = row.cells[2];
    const amCell    = row.cells[3];
  
    const currentType  = typeCell.innerText;
    const currentPrice = priceCell.innerText;
    const currentAm    = amCell.innerText;
  
    // Convert to inputs
    typeCell.innerHTML  = `<input type="text" value="${currentType}" />`;
    priceCell.innerHTML = `<input type="number" value="${currentPrice}" />`;
    amCell.innerHTML    = `<input type="text" value="${currentAm}" />`;
  
    // Switch Edit btn to Save
    const editBtn = row.querySelector(".edit");
    editBtn.textContent = "Save";
    editBtn.replaceWith(editBtn.cloneNode(true));
    const newEditBtn = row.querySelector(".edit");
    newEditBtn.addEventListener("click", () => saveRoomEdits(row));
  }
  
  async function saveRoomEdits(row) {
    const docId = row.dataset.docId;
    const typeCell  = row.cells[1];
    const priceCell = row.cells[2];
    const amCell    = row.cells[3];
  
    const newType  = typeCell.querySelector("input").value.trim();
    const newPrice = parseFloat(priceCell.querySelector("input").value.trim()) || 0;
    const newAm    = amCell.querySelector("input").value.trim();
  
    // Parse amenities
    const newAmenities = newAm ? newAm.split(",").map(a => a.trim()) : [];
  
    try {
      await updateDoc(doc(db, "Room", docId), {
        type: newType,
        price: newPrice,
        amenities: newAmenities
      });
      // revert cells to text
      typeCell.innerHTML  = newType;
      priceCell.innerHTML = newPrice;
      amCell.innerHTML    = newAmenities.join(", ");
  
      // revert button to Edit
      const editBtn = row.querySelector(".edit");
      editBtn.textContent = "Edit";
      editBtn.replaceWith(editBtn.cloneNode(true));
      const restoredBtn = row.querySelector(".edit");
      restoredBtn.addEventListener("click", () => editRoom(row));
  
      alert(`Room "${docId}" updated successfully!`);
    } catch (err) {
      console.error("Error updating room:", err);
      alert(err.message);
    }
  }
  
  // 9. Delete Room => remove doc from "Room"
  async function deleteRoom(row) {
    const docId = row.dataset.docId;
    if (!confirm(`Are you sure you want to delete room "${docId}"?`)) return;
  
    try {
      await deleteDoc(doc(db, "Room", docId));
      row.remove();
      alert(`Room "${docId}" deleted!`);
    } catch (err) {
      console.error("Error deleting room:", err);
      alert(err.message);
    }
  }
  
  // 10. Load All Bookings => join with Guest
  async function loadAllBookings() {
    bookingsTableBody.innerHTML = "";
    const snap = await getDocs(collection(db, "Booking"));
  
    // We'll do a small join: for each booking.guestID, load the Guest doc
    for (const bDoc of snap.docs) {
      const b = bDoc.data();
      const bookingId = bDoc.id; // e.g. "B101"
      const guestID   = b.guestID || "";
      let guestName   = "";
      let guestEmail  = "";
      let guestPhone  = "";
  
      // fetch Guest doc
      if (guestID) {
        const gSnap = await getDoc(doc(db, "Guest", guestID));
        if (gSnap.exists()) {
          const gData = gSnap.data();
          guestName  = `${gData.fName || ""} ${gData.sName || ""}`;
          guestEmail = gData.email || "";
          guestPhone = gData.phoneNum || "";
        }
      }
  
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${bookingId}</td>
        <td>${b.roomID || ""}</td>
        <td>${b.checkInDate || ""}</td>
        <td>${b.checkOutDate || ""}</td>
        <td>${guestName}</td>
        <td>${guestEmail}</td>
        <td>${guestPhone}</td>
        <td>${b.status || ""}</td>
      `;
      bookingsTableBody.appendChild(row);
    }
  }
  