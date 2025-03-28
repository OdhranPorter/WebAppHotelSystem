import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDw5aeA0uwE7R06Ht1wjkx6TcehPWs0Hac",
    authDomain: "hotel-booking-3aad3.firebaseapp.com",
    projectId: "hotel-booking-3aad3",
    storageBucket: "hotel-booking-3aad3.firebasestorage.app",
    messagingSenderId: "385718256742",
    appId: "1:385718256742:web:03fc7761dbf7e7345ad9a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentAction = null;
let currentPaymentBooking = null;
let currentExtrasBooking = null;

// Modal handling
const modals = document.querySelectorAll('.modal');
const codeModal = document.getElementById('codeModal');
const passwordModal = document.getElementById('passwordModal');
const paymentModal = document.getElementById('paymentModal');
const extrasModal = document.getElementById('extrasModal');

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => {
        modals.forEach(m => m.style.display = 'none');
    };
});

window.onclick = (event) => {
    if (event.target.classList.contains('modal')) {
        modals.forEach(m => m.style.display = 'none');
    }
};

// Profile data loading
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const userDoc = await getDoc(doc(db, "Guest", user.uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        document.getElementById('displayName').textContent =
            `${userData.fName} ${userData.sName}`;
        document.getElementById('displayEmail').textContent = user.email;
        document.getElementById('displayPhone').textContent = userData.phoneNum || 'N/A';

        // Load bookings
        const bookingsQuery = query(collection(db, "Booking"), where("guestID", "==", user.uid));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsList = document.getElementById('bookingsList');
        bookingsList.innerHTML = '';

        if (bookingsSnapshot.empty) {
            bookingsList.innerHTML = '<p class="no-bookings">No upcoming bookings found</p>';
            return;
        }

        // Sort bookings
        const bookingsDocs = bookingsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        bookingsDocs.sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));

        for (const booking of bookingsDocs) {
            try {
                const roomDoc = await getDoc(doc(db, "Room", booking.roomID));
                const roomData = roomDoc.data();
                const typeDoc = await getDoc(doc(db, "RoomType", roomData.type));
                const typeData = typeDoc.data();

                const bookingCard = createBookingCard(
                    booking,
                    roomData.type,
                    typeData,
                    booking.id
                );
                bookingsList.appendChild(bookingCard);
            } catch (error) {
                console.error("Error processing booking:", error);
            }
        }

    } catch (error) {
        console.error("Error loading profile:", error);
        bookingsList.innerHTML = '<p class="error-msg">Error loading bookings. Please refresh.</p>';
    }
});

function createBookingCard(booking, roomType, typeData, bookingId) {
    const status = booking.status.toLowerCase();
    let buttons = `<button class="cancel-btn" onclick="cancelBooking('${bookingId}', '${status}')">
                        Cancel Booking
                   </button>`;

    if (status === 'pending') {
        buttons += `<button class="pay-btn" onclick="showPaymentModal('${bookingId}', ${typeData.price}, ${calculateNights(booking)})">
                        Pay Now (€${typeData.price * calculateNights(booking)})
                    </button>`;
    }
    else if (status === 'checkedin') {
        buttons += `<button class="edit-extras-btn" onclick="showExtrasModal('${bookingId}')">
                        Edit Extras
                    </button>`;
    }
    
    const card = document.createElement('div');
    card.className = `booking-card ${status}`;
    card.innerHTML = `
        <div class="booking-image-container">
            <img src="${typeData.images[0]}" alt="${roomType} Room" class="booking-image">
        </div>
        <div class="booking-details">
            <h3 class="booking-type">${roomType} Room (Booking #${bookingId})</h3>
            <p class="booking-dates">${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}</p>
            <div class="booking-status ${status}">${status.toUpperCase()}</div>
            <ul class="amenities-list">
                ${typeData.amenities.map(amenity => `
                    <li>
                        <img src="${getAmenityIcon(amenity)}" class="amenity-icon" alt="${amenity}">
                        ${amenity}
                    </li>
                `).join('')}
            </ul>
            ${buttons}
        </div>
    `;
    return card;
}

function calculateNights(booking) {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function getAmenityIcon(amenity) {
    const name = amenity.toLowerCase();
    const icons = {
        wifi: 'images/icon_wifi.png',
        tv: 'images/icon_tv.png',
        'mini-bar': 'images/icon_minibar.jpg',
        'room service': 'images/icon_service.jpg',
        'air conditioning': 'images/icon_aircon.png',
        crib: 'images/icon_crib.png',
        towels: 'images/icon_towels.png'
    };
    return icons[name] || 'images/icon_amenity.png';
}

// ----------------- Extras Functions -----------------
window.showExtrasModal = async function(bookingId) {
    currentExtrasBooking = { 
        id: bookingId, 
        extrasCost: 0, 
        extras: []
    };

    const extrasForm = document.getElementById('extrasForm');
    extrasForm.innerHTML = '<h3>Select Extras</h3>';

    try {
        // Get available extras from Firebase
        const extrasSnapshot = await getDocs(collection(db, "Extras"));
        const bookingDoc = await getDoc(doc(db, "Booking", bookingId));
        
        if (!bookingDoc.exists()) return;
        const currentExtras = bookingDoc.data().extras || [];

        // Create checkbox for each extra
        extrasSnapshot.forEach((doc) => {
            const extra = doc.data();
            const div = document.createElement('div');
            div.innerHTML = `
                <input type="checkbox" 
                       id="extra_${doc.id}" 
                       name="extras" 
                       value="${extra.name}" 
                       data-price="${extra.price}"
                       ${currentExtras.includes(extra.name) ? 'checked' : ''}
                       ${currentExtras.includes(extra.name) ? 'disabled' : ''}>
                <label for="extra_${doc.id}">${extra.name} (€${extra.price})</label>
            `;
            extrasForm.appendChild(div);
        });

        // Add total display and button
        const totalDiv = document.createElement('div');
        totalDiv.innerHTML = `
            <p>Total Extras Cost: €<span id="extrasTotal">0.00</span></p>
            <button type="button" onclick="saveExtras()">Save Extras</button>
        `;
        extrasForm.appendChild(totalDiv);

        // Calculate initial total
        window.calculateExtras();
        extrasModal.style.display = 'block';

        // Add event listeners
        const checkboxes = extrasForm.querySelectorAll('input[name="extras"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', window.calculateExtras);
        });

    } catch (error) {
        console.error("Error loading extras:", error);
        alert('Error loading extras options');
    }
};

window.calculateExtras = function() {
    const checkboxes = document.querySelectorAll('#extrasForm input[name="extras"]:not(:disabled)');
    let total = 0;
    let selectedExtras = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const price = parseFloat(checkbox.dataset.price);
            total += price;
            selectedExtras.push(checkbox.value);
        }
    });
    
    currentExtrasBooking.extrasCost = total;
    currentExtrasBooking.extras = selectedExtras;
    document.getElementById('extrasTotal').textContent = total.toFixed(2);
};

window.saveExtras = async function() {
    try {
        // Get existing extras to preserve disabled ones
        const bookingDoc = await getDoc(doc(db, "Booking", currentExtrasBooking.id));
        const existingExtras = bookingDoc.data().extras || [];
        
        // Merge new selections with existing extras
        const allExtras = [...existingExtras, ...currentExtrasBooking.extras];
        
        await updateDoc(doc(db, "Booking", currentExtrasBooking.id), {
            extras: allExtras,
            extrasCost: currentExtrasBooking.extrasCost
        });
        
        alert("Extras updated successfully!");
        extrasModal.style.display = 'none';
        location.reload();
    } catch (error) {
        console.error("Failed to update extras:", error);
        alert("Error updating extras: " + error.message);
    }
};

// ----------------- Remaining Functions -----------------
window.showPaymentModal = function(bookingId, price, nights) {
    currentPaymentBooking = {
        id: bookingId,
        amount: price * nights
    };
    document.getElementById('paymentAmount').textContent = currentPaymentBooking.amount.toFixed(2);
    paymentModal.style.display = 'block';
};

window.submitPayment = async function() {
    let originalText;
    try {
        const button = document.querySelector('.payment-submit-btn');
        originalText = button.innerHTML;
        
        button.innerHTML = `
            <div class="loading-spinner"></div>
            Processing Payment...
        `;
        button.disabled = true;

        const paymentDetails = {
            name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: {
                street: document.getElementById('street').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zip: document.getElementById('zip').value,
                country: document.getElementById('country').value
            },
            card: {
                name: document.getElementById('cardName').value,
                number: document.getElementById('cardNumber').value,
                expiry: document.getElementById('expiryDate').value,
                cvc: document.getElementById('cvc').value
            },
            amount: currentPaymentBooking.amount
        };

        console.log('Demo Payment Details:', paymentDetails);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (Math.random() < 0.1) {
            throw new Error('Payment declined: Insufficient funds');
        }

        await updateDoc(doc(db, "Booking", currentPaymentBooking.id), {
            status: 'booked'
        });
        alert('✅ Payment successful!\nBooking confirmed as "booked".');
        location.reload();
    } catch (error) {
        alert(`❌ Payment failed: ${error.message}`);
    } finally {
        const button = document.querySelector('.payment-submit-btn');
        button.innerHTML = originalText;
        button.disabled = false;
        paymentModal.style.display = 'none';
    }
};

window.cancelBooking = async (bookingId, status) => {
    const message = status === 'booked' ? 
        'Cancel this booked reservation?' : 
        'Cancel this checked-in booking? There may be cancellation fees.';
    
    if (confirm(message)) {
        try {
            await deleteDoc(doc(db, "Booking", bookingId));
            alert('Booking cancelled successfully.');
            location.reload();
        } catch (error) {
            console.error("Cancellation failed:", error);
            alert('Failed to cancel booking.');
        }
    }
};

window.togglePassword = async () => {
    currentAction = 'showPassword';
    codeModal.style.display = 'block';
    await sendVerificationCode();
};

async function sendVerificationCode() {
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        alert('Verification code "sent" to your email\nUse test code: 123456');
    } catch (error) {
        alert('Verification system error.');
    }
}

window.submitCode = async function() {
    const enteredCode = document.getElementById('verificationCode').value;
    
    if (enteredCode === "123456") {
        codeModal.style.display = 'none';
        
        if (currentAction === 'showPassword') {
            const userDoc = await getDoc(doc(db, "Guest", auth.currentUser.uid));
            document.getElementById('displayPass').textContent = userDoc.data().password;
            setTimeout(() => {
                document.getElementById('displayPass').textContent = '********';
            }, 30000);
        } else if (currentAction === 'changePassword') {
            passwordModal.style.display = 'block';
        }
    } else {
        document.getElementById('codeError').textContent = 'Invalid code. Use 123456';
    }
};

window.submitNewPassword = async () => {
    const newPassword = document.getElementById('newPassword').value;
    try {
        await updatePassword(auth.currentUser, newPassword);
        await updateDoc(doc(db, "Guest", auth.currentUser.uid), {
            password: newPassword
        });
        passwordModal.style.display = 'none';
        alert('Password updated successfully.');
    } catch (error) {
        alert('Password update failed: ' + error.message);
    }
};

window.toggleEdit = function() {
    document.getElementById('personalDetails').style.display = 'none';
    document.getElementById('editForm').style.display = 'block';
    const user = auth.currentUser;
    getDoc(doc(db, "Guest", user.uid)).then(doc => {
        const data = doc.data();
        document.getElementById('editFName').value = data.fName;
        document.getElementById('editSName').value = data.sName;
        document.getElementById('editPhone').value = data.phoneNum || '';
    });
};

window.cancelEdit = () => {
    document.getElementById('personalDetails').style.display = 'block';
    document.getElementById('editForm').style.display = 'none';
};

window.saveChanges = async () => {
    const user = auth.currentUser;
    const updates = {
        fName: document.getElementById('editFName').value.trim(),
        sName: document.getElementById('editSName').value.trim(),
        phoneNum: document.getElementById('editPhone').value.trim()
    };

    try {
        await updateDoc(doc(db, "Guest", user.uid), updates);
        location.reload();
    } catch (error) {
        console.error("Update failed:", error);
        alert(`Update failed: ${error.message}`);
    }
};