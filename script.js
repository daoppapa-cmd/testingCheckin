// ==========================================
// 1. IMPORTS & SETUP
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  setLogLevel,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getDatabase,
  ref,
  get,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// ==========================================
// 2. GLOBAL VARIABLES
// ==========================================
let dbAttendance, dbLeave, dbEmployeeList, dbShift, authAttendance;
let allEmployees = [];
let currentMonthRecords = [];
let attendanceRecords = [];
let leaveRecords = [];
let currentUser = null;
let currentUserShift = null;
let attendanceCollectionRef = null;
let attendanceListener = null;
let leaveCollectionListener = null;
let outCollectionListener = null;
let currentConfirmCallback = null;
let shiftSettings = {};
let sessionCollectionRef = null;
let sessionListener = null;
let currentDeviceId = null;
let modelsLoaded = false;
let currentUserFaceMatcher = null;
let currentScanAction = null;
let videoStream = null;
const FACE_MATCH_THRESHOLD = 0.5;

const durationMap = {
  មួយថ្ងៃកន្លះ: 1.5, ពីរថ្ងៃ: 2, ពីរថ្ងៃកន្លះ: 2.5, បីថ្ងៃ: 3, បីថ្ងៃកន្លះ: 3.5,
  បួនថ្ងៃ: 4, បួនថ្ងៃកន្លះ: 4.5, ប្រាំថ្ងៃ: 5, ប្រាំថ្ងៃកន្លះ: 5.5,
  ប្រាំមួយថ្ងៃ: 6, ប្រាំមួយថ្ងៃកន្លះ: 6.5, ប្រាំពីរថ្ងៃ: 7,
};

// ==========================================
// 3. CONFIGURATIONS
// ==========================================
const firebaseConfigAttendance = {
  apiKey: "AIzaSyCgc3fq9mDHMCjTRRHD3BPBL31JkKZgXFc",
  authDomain: "checkme-10e18.firebaseapp.com",
  databaseURL: "https://checkme-10e18-default-rtdb.firebaseio.com",
  projectId: "checkme-10e18",
  storageBucket: "checkme-10e18.firebasestorage.app",
  messagingSenderId: "1030447497157",
  appId: "1:1030447497157:web:9792086df1e864559fd5ac",
  measurementId: "G-QCJ2JH4WH6",
};
const firebaseConfigLeave = {
  apiKey: "AIzaSyDjr_Ha2RxOWEumjEeSdluIW3JmyM76mVk",
  authDomain: "dipermisstion.firebaseapp.com",
  projectId: "dipermisstion",
  storageBucket: "dipermisstion.firebasestorage.app",
  messagingSenderId: "512999406057",
  appId: "1:512999406057:web:953a281ab9dde7a9a0f378",
  measurementId: "G-KDPHXZ7H4B",
};
const firebaseConfigEmployeeList = {
  apiKey: "AIzaSyAc2g-t9A7du3K_nI2fJnw_OGxhmLfpP6s",
  authDomain: "dilistname.firebaseapp.com",
  databaseURL: "https://dilistname-default-rtdb.firebaseio.com",
  projectId: "dilistname",
  storageBucket: "dilistname.firebasestorage.app",
  messagingSenderId: "897983357871",
  appId: "1:897983357871:web:42a046bc9fb3e0543dc55a",
  measurementId: "G-NQ798D9J6K"
};

const allowedAreaCoords = [
  [11.415206789703271, 104.7642005060435],
  [11.41524294053174, 104.76409925265823],
  [11.413750665249953, 104.7633762203053],
  [11.41370399757057, 104.7634714387206],
];

// ==========================================
// 4. DOM ELEMENTS
// ==========================================
const loadingView = document.getElementById("loadingView");
const loadingText = document.getElementById("loadingText");
const employeeListView = document.getElementById("employeeListView");
const homeView = document.getElementById("homeView");
const historyView = document.getElementById("historyView");
const footerNav = document.getElementById("footerNav");
const navHomeButton = document.getElementById("navHomeButton");
const navHistoryButton = document.getElementById("navHistoryButton");
const searchInput = document.getElementById("searchInput");
const employeeListContainer = document.getElementById("employeeListContainer");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutButton = document.getElementById("logoutButton");
const exitAppButton = document.getElementById("exitAppButton");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileId = document.getElementById("profileId");
const profileDepartment = document.getElementById("profileDepartment");
const profileGroup = document.getElementById("profileGroup");
const profileShift = document.getElementById("profileShift");

// Smart UI Elements
const actionButtonContainer = document.getElementById("actionButtonContainer");
const mainActionButton = document.getElementById("mainActionButton");
const actionBtnBg = document.getElementById("actionBtnBg");
const actionBtnTitle = document.getElementById("actionBtnTitle");
const actionBtnSubtitle = document.getElementById("actionBtnSubtitle");
const actionBtnIcon = document.getElementById("actionBtnIcon");
const statusMessageContainer = document.getElementById("statusMessageContainer");
const statusTitle = document.getElementById("statusTitle");
const statusDesc = document.getElementById("statusDesc");
const statusIcon = document.getElementById("statusIcon");
const statusIconBg = document.getElementById("statusIconBg");
const noShiftContainer = document.getElementById("noShiftContainer");
const todayActivitySection = document.getElementById("todayActivitySection");
const dateBadge = document.getElementById("dateBadge");
const shiftStatusIndicator = document.getElementById("shiftStatusIndicator");

const historyContainer = document.getElementById("historyContainer");
const monthlyHistoryContainer = document.getElementById("monthlyHistoryContainer");
const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancelButton = document.getElementById("modalCancelButton");
const modalConfirmButton = document.getElementById("modalConfirmButton");
const modalIcon = document.getElementById("modalIcon");
const cameraModal = document.getElementById("cameraModal");
const videoElement = document.getElementById("videoElement");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCloseButton = document.getElementById("cameraCloseButton");
const cameraLoadingText = document.getElementById("cameraLoadingText");
const cameraHelpText = document.getElementById("cameraHelpText");
const captureButton = document.getElementById("captureButton");
const employeeListHeader = document.getElementById("employeeListHeader");
const employeeListContent = document.getElementById("employeeListContent");

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

function changeView(viewId) {
  [loadingView, employeeListView, homeView, historyView].forEach(v => {
      if (v) v.style.display = "none";
  });
  
  const view = document.getElementById(viewId);
  if (view) view.style.display = "flex";

  if (viewId === "homeView" || viewId === "historyView") {
    footerNav.style.display = "block";
  } else {
    footerNav.style.display = "none";
  }
}

function showMessage(title, message, isError = false) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  if (isError) {
      if(modalIcon) {
        modalIcon.innerHTML = '<i class="ph-duotone ph-warning-circle text-3xl text-red-500"></i>';
        modalIcon.className = "w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4";
      }
  } else {
      if(modalIcon) {
        modalIcon.innerHTML = '<i class="ph-duotone ph-info text-3xl text-blue-600"></i>';
        modalIcon.className = "w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4";
      }
  }
  
  modalConfirmButton.onclick = () => hideMessage();
  modalCancelButton.style.display = "none";
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function showConfirmation(title, message, confirmText, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  if(modalIcon) {
    modalIcon.innerHTML = '<i class="ph-duotone ph-question text-3xl text-orange-500"></i>';
    modalIcon.className = "w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4";
  }

  modalConfirmButton.textContent = confirmText;
  modalCancelButton.style.display = "block";
  modalConfirmButton.onclick = onConfirm;
  
  customModal.classList.remove("modal-hidden");
  customModal.classList.add("modal-visible");
}

function hideMessage() {
  customModal.classList.add("modal-hidden");
  customModal.classList.remove("modal-visible");
}

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const monthString = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDayString = String(lastDay).padStart(2, "0");
  return { startOfMonth: `${year}-${monthString}-01`, endOfMonth: `${year}-${monthString}-${lastDayString}` };
}

function formatDate(date) {
  try {
    const day = String(date.getDate()).padStart(2, "0");
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) { return ""; }
}

function parseTimeStringToDecimal(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleanStr = timeStr.replace(/[^a-zA-Z0-9:]/g, ''); 
  const match = cleanStr.match(/(\d+):(\d+)(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  else if (ampm === "AM" && hours === 12) hours = 0;
  return hours + (minutes / 60);
}

function getCaseInsensitiveProp(obj, propName) {
    if (!obj) return undefined;
    const lowerProp = propName.toLowerCase().trim();
    for (const key of Object.keys(obj)) {
        if (key.toLowerCase().trim() === lowerProp) return obj[key];
    }
    return undefined;
}

function checkShiftTime(shiftType, checkType) {
  if (!shiftType || shiftType === "N/A" || shiftType === "None") return false;
  if (shiftType === "Uptime") return true;

  const settings = shiftSettings[shiftType];
  if (!settings) return false;

  let startStr, endStr;
  if (checkType === "checkIn") {
    startStr = getCaseInsensitiveProp(settings, "StartCheckIn");
    endStr = getCaseInsensitiveProp(settings, "EndCheckIn");
  } else {
    startStr = getCaseInsensitiveProp(settings, "StartCheckOut");
    endStr = getCaseInsensitiveProp(settings, "EndCheckOut");
  }

  if (!startStr || !endStr) return false;

  const minTime = parseTimeStringToDecimal(startStr);
  const maxTime = parseTimeStringToDecimal(endStr);
  if (minTime === null || maxTime === null) return false;

  const now = new Date();
  const currentTime = now.getHours() + now.getMinutes() / 60;

  if (minTime > maxTime) return currentTime >= minTime || currentTime <= maxTime;
  return currentTime >= minTime && currentTime <= maxTime;
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error("Not supported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (e) => reject(new Error("សូមបើក Location")),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

function isInsideArea(lat, lon) {
  const polygon = allowedAreaCoords;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const viy = polygon[i][0], vix = polygon[i][1];
    const vjy = polygon[j][0], vjx = polygon[j][1];
    if ((viy > lat) !== (vjy > lat) && lon < ((vjx - vix) * (lat - viy)) / (vjy - viy) + vix) {
      isInside = !isInside;
    }
  }
  return isInside;
}

// ==========================================
// 6. DATA PROCESSING & LOGIC
// ==========================================

function mergeAttendanceAndLeave(attendanceRecords, leaveRecords) {
  const mergedMap = new Map();
  attendanceRecords.forEach(r => mergedMap.set(r.date, { ...r }));
  // Leave logic would merge here, simplified for now
  return Array.from(mergedMap.values());
}

async function mergeAndRenderHistory() {
  currentMonthRecords = mergeAttendanceAndLeave(attendanceRecords, leaveRecords);
  const todayString = getTodayDateString();
  
  currentMonthRecords.sort((a, b) => {
    if (a.date === todayString) return -1;
    if (b.date === todayString) return 1;
    return b.date.localeCompare(a.date);
  });

  renderTodayHistory();
  renderMonthlyHistory();
  updateButtonState(); 
}

// ==========================================
// 7. RENDERING FUNCTIONS
// ==========================================

function renderTodayHistory() {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  container.innerHTML = "";

  const todayString = getTodayDateString();
  const todayRecord = currentMonthRecords.find((record) => record.date === todayString);

  if (!todayRecord) {
    container.innerHTML = `<p class="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">មិនទាន់មានទិន្នន័យ</p>`;
    return;
  }
  
  const checkIn = todayRecord.checkIn || "---";
  const checkOut = todayRecord.checkOut || "មិនទាន់ចេញ";
  const ciClass = todayRecord.checkIn ? "text-green-600" : "text-slate-400";
  const coClass = todayRecord.checkOut ? "text-red-600" : "text-slate-400";

  const card = document.createElement("div");
  card.className = "bg-blue-50/50 p-4 rounded-2xl border border-blue-100";
  card.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <span class="text-xs font-semibold text-blue-500 bg-blue-100 px-2 py-1 rounded">Today</span>
        <span class="text-sm font-bold text-slate-700">${todayRecord.formattedDate || todayRecord.date}</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
         <div class="text-center p-2 bg-white rounded-xl shadow-sm">
            <p class="text-xs text-slate-400 mb-1">ចូល</p>
            <p class="${ciClass} font-bold text-sm">${checkIn}</p>
         </div>
         <div class="text-center p-2 bg-white rounded-xl shadow-sm">
            <p class="text-xs text-slate-400 mb-1">ចេញ</p>
            <p class="${coClass} font-bold text-sm">${checkOut}</p>
         </div>
      </div>
  `;
  container.appendChild(card);
}

function renderMonthlyHistory() {
  const container = document.getElementById("monthlyHistoryContainer");
  if (!container) return;
  container.innerHTML = "";

  if (currentMonthRecords.length === 0) {
    container.innerHTML = `<p class="text-center py-10 text-slate-400">មិនទាន់មានទិន្នន័យ</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  currentMonthRecords.forEach((record) => {
    const isToday = record.date === getTodayDateString();
    if(isToday) return; // Skip today

    const checkIn = record.checkIn ? record.checkIn : "អវត្តមាន";
    const checkOut = record.checkOut ? record.checkOut : "អវត្តមាន";
    
    const ciClass = record.checkIn ? "text-blue-600" : "text-red-500";
    const coClass = record.checkOut ? "text-blue-600" : "text-red-500";
    
    const card = document.createElement("div");
    card.className = "bg-white p-4 rounded-2xl shadow-sm border border-slate-50 mb-3";
    card.innerHTML = `
        <p class="text-sm font-bold text-slate-800 mb-3">${record.formattedDate || record.date}</p>
        <div class="flex flex-col space-y-2 text-sm">
          <div class="flex justify-between border-b border-slate-50 pb-1">
            <span class="text-slate-500">ចូល</span>
            <span class="${ciClass} font-medium">${checkIn}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">ចេញ</span>
            <span class="${coClass} font-medium">${checkOut}</span>
          </div>
        </div>
    `;
    fragment.appendChild(card);
  });
  container.appendChild(fragment);
}

function renderEmployeeList(employees) {
  const container = document.getElementById("employeeListContainer");
  if(!container) return;
  
  container.innerHTML = "";
  container.classList.remove("hidden");

  if (employees.length === 0) {
    container.innerHTML = `<p class="text-center text-gray-500 p-3">រកមិនឃើញ។</p>`;
    return;
  }
  
  const fragment = document.createDocumentFragment();

  employees.forEach((emp) => {
    const card = document.createElement("div");
    card.className = "flex items-center p-3 rounded-xl cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-sm mb-2 bg-white border border-slate-50";
    card.innerHTML = `
              <img src="${emp.photoUrl || "https://placehold.co/48x48/e2e8f0/64748b?text=No+Img"}" 
                  class="w-12 h-12 rounded-full object-cover border-2 border-slate-100 mr-3 bg-slate-200"
                  loading="lazy">
              <div>
                  <h3 class="text-sm font-bold text-slate-800">${emp.name}</h3>
                  <p class="text-xs text-slate-500">ID: ${emp.id}</p>
              </div>
          `;
    card.onmousedown = () => selectUser(emp);
    fragment.appendChild(card);
  });
  
  container.appendChild(fragment);
}

// ==========================================
// 8. LISTENER SETUP FUNCTIONS
// ==========================================

function setupAttendanceListener() {
  if (!attendanceCollectionRef) return;
  if (attendanceListener) attendanceListener();

  attendanceListener = onSnapshot(attendanceCollectionRef, (querySnapshot) => {
      let allRecords = [];
      querySnapshot.forEach((doc) => allRecords.push(doc.data()));
      const { startOfMonth, endOfMonth } = getCurrentMonthRange();
      attendanceRecords = allRecords.filter((record) => record.date >= startOfMonth && record.date <= endOfMonth);
      mergeAndRenderHistory();
    });
}

function startLeaveListeners() {
  if (!dbLeave || !currentUser) return;
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  const employeeId = currentUser.id;
  const reFetch = async () => {
    // leaveRecords = await fetchAllLeaveForMonth(employeeId); // Placeholder for fetch logic
    mergeAndRenderHistory();
  };
  
  const qLeave = query(collection(dbLeave, "/artifacts/default-app-id/public/data/leave_requests"), where("userId", "==", employeeId));
  leaveCollectionListener = onSnapshot(qLeave, reFetch);
  const qOut = query(collection(dbLeave, "/artifacts/default-app-id/public/data/out_requests"), where("userId", "==", employeeId));
  outCollectionListener = onSnapshot(qOut, reFetch);
}

function startSessionListener(employeeId) {
  if (sessionListener) sessionListener();
  const sessionDocRef = doc(sessionCollectionRef, employeeId);
  sessionListener = onSnapshot(sessionDocRef, (docSnap) => {
    if (!docSnap.exists()) { forceLogout("Session បានបញ្ចប់។"); return; }
    const sessionData = docSnap.data();
    if (localStorage.getItem("currentDeviceId") && sessionData.deviceId !== localStorage.getItem("currentDeviceId")) {
      forceLogout("គណនីកំពុងប្រើនៅកន្លែងផ្សេង។");
    }
  });
}

function listenToShiftSettings() {
  const shiftRef = ref(dbShift, 'វេនធ្វើការ');
  onValue(shiftRef, (snapshot) => {
    if (snapshot.exists()) {
      shiftSettings = snapshot.val();
      if (currentUser) updateButtonState();
    }
  });
}

// ==========================================
// 9. FACE & CAMERA FUNCTIONS
// ==========================================

async function loadAIModels() {
  try {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("./models")
    ]);
    modelsLoaded = true;
    fetchEmployeesFromRTDB(); 
  } catch (e) { console.error(e); }
}

async function prepareFaceMatcher(imageUrl) {
  currentUserFaceMatcher = null;
  if (!imageUrl || imageUrl.includes("placehold.co")) return;
  try {
    const img = await faceapi.fetchImage(imageUrl, { mode: 'cors' }); // Added mode cors
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (detection) currentUserFaceMatcher = new faceapi.FaceMatcher(detection.descriptor);
  } catch (e) { }
}

async function startFaceScan(action) {
  currentScanAction = action;
  if (!modelsLoaded) { showMessage("Notice", "AI មិនទាន់ដំណើរការ។"); return; }
  
  cameraModal.classList.remove("modal-hidden");
  cameraModal.classList.add("modal-visible");
  
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } });
    videoElement.srcObject = videoStream;
    videoElement.onplay = () => { setTimeout(handleCaptureAndAnalyze, 1000); };
  } catch (err) {
    showMessage("Error", "កាមេរ៉ាមានបញ្ហា");
    hideCameraModal();
  }
}

function stopCamera() {
  if (videoStream) videoStream.getTracks().forEach(t => t.stop());
  videoElement.srcObject = null;
}

function hideCameraModal() {
  stopCamera();
  cameraModal.classList.add("modal-hidden");
  cameraModal.classList.remove("modal-visible");
}

async function handleCaptureAndAnalyze() {
  if(cameraLoadingText) cameraLoadingText.textContent = "កំពុងផ្ទៀងផ្ទាត់...";
  const displaySize = { width: videoElement.videoWidth, height: videoElement.videoHeight };
  faceapi.matchDimensions(cameraCanvas, displaySize);
  cameraCanvas.getContext("2d").drawImage(videoElement, 0, 0, displaySize.width, displaySize.height);

  try {
    const detection = await faceapi.detectSingleFace(cameraCanvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
        if(cameraLoadingText) cameraLoadingText.textContent = "រកមិនឃើញមុខ... ព្យាយាមម្តងទៀត";
        setTimeout(handleCaptureAndAnalyze, 500);
        return;
    }
    
    if (!currentUserFaceMatcher) {
         processScanSuccess(); 
         return;
    }

    const match = currentUserFaceMatcher.findBestMatch(detection.descriptor);
    if (match.distance < FACE_MATCH_THRESHOLD) {
        processScanSuccess();
    } else {
        if(cameraLoadingText) cameraLoadingText.textContent = "មុខមិនត្រូវគ្នា! ព្យាយាមម្តងទៀត";
        setTimeout(handleCaptureAndAnalyze, 1000);
    }
  } catch (e) {
    setTimeout(handleCaptureAndAnalyze, 1000);
  }
}

function processScanSuccess() {
    if(cameraLoadingText) cameraLoadingText.innerHTML = '<span class="text-green-400">ជោគជ័យ!</span>';
    setTimeout(() => {
        hideCameraModal();
        if (currentScanAction === "checkIn") handleCheckIn();
        else handleCheckOut();
    }, 800);
}

// ==========================================
// 10. MAIN ACTION & UI FUNCTIONS
// ==========================================

async function handleCheckIn() {
  if(actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  
  try {
     const coords = await getUserLocation();
     if (!isInsideArea(coords.latitude, coords.longitude)) {
         showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
         updateButtonState();
         return;
     }
     
     const now = new Date();
     const todayDocId = getTodayDateString(now);
     
     await setDoc(doc(attendanceCollectionRef, todayDocId), {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        department: currentUser.department,
        shift: currentUserShift,
        date: todayDocId,
        checkInTimestamp: now.toISOString(),
        formattedDate: formatDate(now),
        checkIn: formatTime(now),
        checkInLocation: { lat: coords.latitude, lon: coords.longitude }
     });
     showMessage("ជោគជ័យ", "បាន Check-in ដោយជោគជ័យ");
     
  } catch (e) {
     showMessage("Error", e.message, true);
     updateButtonState();
  }
}

async function handleCheckOut() {
  if(actionBtnTitle) actionBtnTitle.textContent = "កំពុងដំណើរការ...";
  
  try {
     const coords = await getUserLocation();
     if (!isInsideArea(coords.latitude, coords.longitude)) {
         showMessage("ទីតាំង", "អ្នកនៅក្រៅបរិវេណក្រុមហ៊ុន");
         updateButtonState();
         return;
     }
     
     const now = new Date();
     const todayDocId = getTodayDateString(now);
     
     await updateDoc(doc(attendanceCollectionRef, todayDocId), {
        checkOutTimestamp: now.toISOString(),
        checkOut: formatTime(now),
        checkOutLocation: { lat: coords.latitude, lon: coords.longitude }
     });
     showMessage("ជោគជ័យ", "បាន Check-out ដោយជោគជ័យ");
     
  } catch (e) {
     showMessage("Error", e.message, true);
     updateButtonState();
  }
}

function showActionButton(title, subtitle, icon, gradientClass, action) {
    if(!actionButtonContainer) return;
    actionButtonContainer.classList.remove('hidden');
    actionBtnTitle.textContent = title;
    actionBtnSubtitle.textContent = subtitle;
    actionBtnIcon.className = `ph-fill ${icon} text-2xl`;
    actionBtnBg.className = `absolute inset-0 bg-gradient-to-br ${gradientClass} transition-all duration-500`;
    
    // Remove old listeners
    const newBtn = mainActionButton.cloneNode(true);
    mainActionButton.parentNode.replaceChild(newBtn, mainActionButton);
    
    // Add new listener
    document.getElementById('mainActionButton').addEventListener('click', () => startFaceScan(action));
    document.getElementById('mainActionButton').classList.add('btn-pulse');
}

function showStatusMessage(title, desc, icon, iconBgClass) {
    if(!statusMessageContainer) return;
    statusMessageContainer.classList.remove('hidden');
    statusTitle.textContent = title;
    statusDesc.textContent = desc;
    statusIcon.className = `ph-duotone ${icon} text-3xl`;
    statusIconBg.className = `w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${iconBgClass}`;
}

async function updateButtonState() {
  const todayString = getTodayDateString();
  const todayData = currentMonthRecords.find(r => r.date === todayString);
  const shift = currentUserShift;
  const hasShift = shift && shift !== "N/A" && shift !== "None";

  // Reset Display
  if(actionButtonContainer) actionButtonContainer.classList.add('hidden');
  if(statusMessageContainer) statusMessageContainer.classList.add('hidden');
  if(noShiftContainer) noShiftContainer.classList.add('hidden');
  if(shiftStatusIndicator) shiftStatusIndicator.classList.add('hidden');

  if (!hasShift) {
      if(noShiftContainer) noShiftContainer.classList.remove('hidden');
      return;
  }

  const canCheckIn = checkShiftTime(shift, "checkIn");
  const canCheckOut = checkShiftTime(shift, "checkOut");

  if (todayData && todayData.checkIn) {
      if (todayData.checkOut) {
          showStatusMessage("វត្តមានពេញលេញ", "អ្នកបានបំពេញការងារសម្រាប់ថ្ងៃនេះហើយ", "ph-check-circle", "bg-green-100 text-green-600");
      } else {
          if (canCheckOut) {
              showActionButton("Check Out", "ចុចដើម្បីចាកចេញ", "ph-sign-out", "from-red-500 to-orange-600", "checkOut");
          } else {
              showStatusMessage("កំពុងបំពេញការងារ", "រង់ចាំដល់ម៉ោងចេញពីការងារ", "ph-hourglass", "bg-blue-100 text-blue-600");
          }
      }
  } else {
      if (canCheckIn) {
          showActionButton("Check In", "ចុចដើម្បីចូលធ្វើការ", "ph-sign-in", "from-blue-600 to-cyan-500", "checkIn");
      } else {
          showStatusMessage("ក្រៅម៉ោង Check-in", "សូមរង់ចាំដល់ម៉ោងចូលធ្វើការ", "ph-clock-slash", "bg-slate-100 text-slate-400");
      }
  }
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

// ==========================================
// 11. USER SELECTION & INIT
// ==========================================

async function selectUser(employee) {
  changeView("homeView");
  
  currentUser = employee;
  localStorage.setItem("savedEmployeeId", employee.id);
  
  welcomeMessage.textContent = `សូមស្វាគមន៍`;
  profileImage.src = employee.photoUrl || "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img";
  profileName.textContent = employee.name;
  profileId.textContent = `ID: ${employee.id}`;
  
  // Update Labels (Department & Group)
  if(profileDepartment) profileDepartment.textContent = employee.department || "N/A"; 
  if(profileGroup) profileGroup.textContent = employee.group || "N/A";
  
  const dayOfWeek = new Date().getDay();
  const dayToShiftKey = ["shiftSun", "shiftMon", "shiftTue", "shiftWed", "shiftThu", "shiftFri", "shiftSat"];
  currentUserShift = currentUser[dayToShiftKey[dayOfWeek]] || "N/A";
  if(profileShift) profileShift.textContent = currentUserShift;
  
  const firestoreUserId = currentUser.id;
  const simpleDataPath = `attendance/${firestoreUserId}/records`;
  attendanceCollectionRef = collection(dbAttendance, simpleDataPath);
  
  currentDeviceId = self.crypto.randomUUID();
  localStorage.setItem("currentDeviceId", currentDeviceId);
  
  setDoc(doc(sessionCollectionRef, employee.id), {
      deviceId: currentDeviceId,
      timestamp: new Date().toISOString(),
      employeeName: employee.name,
  }).catch(console.error);

  setupAttendanceListener(); // Now defined
  startLeaveListeners();     // Now defined
  startSessionListener(employee.id); // Now defined
  prepareFaceMatcher(employee.photoUrl);
  
  if(employeeListContainer) employeeListContainer.classList.add("hidden");
  if(searchInput) searchInput.value = "";
}

function logout() {
  currentUser = null;
  localStorage.removeItem("savedEmployeeId");
  if (attendanceListener) attendanceListener();
  if (sessionListener) sessionListener();
  if (leaveCollectionListener) leaveCollectionListener();
  if (outCollectionListener) outCollectionListener();

  attendanceRecords = [];
  leaveRecords = [];
  currentMonthRecords = [];
  
  if(historyContainer) historyContainer.innerHTML = "";
  if(monthlyHistoryContainer) monthlyHistoryContainer.innerHTML = "";
  
  changeView("employeeListView");
}

function forceLogout(message) {
  logout();
  showMessage("Log Out", message, true);
}

function checkAutoLogin() {
    const savedId = localStorage.getItem("savedEmployeeId");
    if (savedId) {
        const savedEmp = allEmployees.find(e => e.id === savedId);
        if (savedEmp) selectUser(savedEmp);
        else changeView("employeeListView");
    } else {
        changeView("employeeListView");
    }
}

async function fetchFromNetwork(isFirst = false) {
    try {
        const dbRef = ref(dbEmployeeList, "students");
        const snapshot = await get(dbRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            allEmployees = Object.keys(data).map(key => {
                const student = data[key];
                const schedule = student['កាលវិភាគ'] || {};
                return {
                    id: String(key).trim(),
                    name: student['ឈ្មោះ'] || "N/A",
                    department: student['ផ្នែកការងារ'] || "N/A",
                    photoUrl: student['រូបថត'] || null,
                    group: student['ក្រុម'] || "N/A",
                    gender: student['ភេទ'] || "N/A",
                    grade: student['ថ្នាក់'] || "N/A",
                    shiftMon: schedule['ច័ន្ទ'] || null,
                    shiftTue: schedule['អង្គារ'] || null,
                    shiftWed: schedule['ពុធ'] || null,
                    shiftThu: schedule['ព្រហស្បតិ៍'] || null,
                    shiftFri: schedule['សុក្រ'] || null,
                    shiftSat: schedule['សៅរ៍'] || null,
                    shiftSun: schedule['អាទិត្យ'] || null,
                };
            }).filter(emp => emp.group !== "ការងារក្រៅ" && emp.group !== "បុគ្គលិក");
            
            localforage.setItem('cachedEmployees', allEmployees);
            if(isFirst) checkAutoLogin();
        } else if (isFirst) changeView("employeeListView");
    } catch (e) { if(isFirst) changeView("employeeListView"); }
}

async function fetchEmployeesFromRTDB() {
  changeView("loadingView");
  try {
      const cached = await localforage.getItem('cachedEmployees');
      if (cached && Array.isArray(cached) && cached.length > 0) {
          allEmployees = cached;
          checkAutoLogin();
          fetchFromNetwork(); 
      } else {
          fetchFromNetwork(true);
      }
  } catch (err) { fetchFromNetwork(true); }
}

function setupAuthListener() {
    onAuthStateChanged(authAttendance, (user) => {
      if (user) {
        loadAIModels();
      } else {
        signInAnonymously(authAttendance).catch((error) => {
             showMessage("បញ្ហា", `Login Error: ${error.message}`, true);
        });
      }
    });
}

async function initializeAppFirebase() {
  try {
    const attendanceApp = initializeApp(firebaseConfigAttendance);
    dbAttendance = getFirestore(attendanceApp);
    authAttendance = getAuth(attendanceApp);
    dbShift = getDatabase(attendanceApp);
    sessionCollectionRef = collection(dbAttendance, "active_sessions");

    const leaveApp = initializeApp(firebaseConfigLeave, "leaveApp");
    dbLeave = getFirestore(leaveApp);

    const employeeApp = initializeApp(firebaseConfigEmployeeList, "employeeApp");
    dbEmployeeList = getDatabase(employeeApp);

    setLogLevel("silent");
    
    setupAuthListener();
    listenToShiftSettings();
  } catch (error) { showMessage("Error", error.message, true); }
}

// 12. DOM Event Listeners
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allEmployees.filter(e => e.name.toLowerCase().includes(term) || e.id.includes(term));
        renderEmployeeList(filtered);
    });
    searchInput.addEventListener("focus", () => {
        if(employeeListHeader) employeeListHeader.style.display = "none";
        if(employeeListContent) employeeListContent.style.paddingTop = "1rem";
        renderEmployeeList(allEmployees);
    });
    searchInput.addEventListener("blur", () => {
        setTimeout(() => {
            if(employeeListHeader) employeeListHeader.style.display = "flex";
            if(employeeListContent) employeeListContent.style.paddingTop = "";
            if(employeeListContainer) employeeListContainer.classList.add("hidden");
        }, 200);
    });
}

if(logoutButton) logoutButton.addEventListener("click", () => showConfirmation("Log Out", "ចាកចេញមែនទេ?", "Yes", () => { logout(); hideMessage(); }));
if(exitAppButton) exitAppButton.addEventListener("click", () => showConfirmation("Exit", "បិទកម្មវិធី?", "Yes", () => { window.close(); hideMessage(); }));
if(cameraCloseButton) cameraCloseButton.addEventListener("click", hideCameraModal);
if(navHomeButton) navHomeButton.addEventListener("click", () => { changeView("homeView"); navHomeButton.classList.add("active-nav"); navHistoryButton.classList.remove("active-nav"); });
if(navHistoryButton) navHistoryButton.addEventListener("click", () => { changeView("historyView"); navHistoryButton.classList.add("active-nav"); navHomeButton.classList.remove("active-nav"); });

document.addEventListener("DOMContentLoaded", initializeAppFirebase);
