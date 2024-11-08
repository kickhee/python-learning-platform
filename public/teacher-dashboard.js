// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// เช็คว่า user ล็อกอินอยู่หรือไม่
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        document.getElementById('userEmail').textContent = `อีเมล: ${user.email}`;
        checkTeacherRole(user.uid);
    } else {
        window.location.href = 'index.html';
    }
});

// โหลดข้อมูลผู้ใช้
async function loadUserData(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('userEmail').textContent = `อีเมล: ${auth.currentUser.email}`;
            document.getElementById('userName').textContent = userData.displayName || 'ยังไม่ได้ตั้งชื่อ';
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

// เช็คว่าเป็นครูหรือไม่
async function checkTeacherRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'teacher') {
            loadUserData(userId);
            loadClasses(userId);
        } else {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error checking role:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    }
}

// สร้างรหัสห้องเรียนแบบสุ่ม
function generateClassCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// สร้างห้องเรียน
document.getElementById('createClassBtn').addEventListener('click', async () => {
    const className = document.getElementById('className').value;
    if (!className) {
        alert('กรุณาใส่ชื่อห้องเรียน');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert('กรุณาเข้าสู่ระบบก่อน');
            return;
        }

        const classCode = generateClassCode();
        await db.collection('classes').add({
            name: className,
            code: classCode,
            teacherId: user.uid,
            teacherName: document.getElementById('userName').textContent,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`สร้างห้องเรียนสำเร็จ!\nรหัสห้องเรียน: ${classCode}`);
        document.getElementById('className').value = '';
        loadClasses(user.uid);
    } catch (error) {
        console.error("Error creating class:", error);
        alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน');
    }
});

// โหลดรายการห้องเรียน
async function loadClasses(userId) {
    const classList = document.getElementById('classList');
    classList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

    try {
        const snapshot = await db.collection('classes')
            .where('teacherId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            classList.innerHTML = '<p>ยังไม่มีห้องเรียน</p>';
            return;
        }

        classList.innerHTML = '';
        snapshot.forEach(doc => {
            const classData = doc.data();
            const classDiv = document.createElement('div');
            classDiv.className = 'class-card';
            classDiv.innerHTML = `
                <div class="class-info">
                    <h3>${classData.name}</h3>
                    <p class="class-code">รหัสห้องเรียน: ${classData.code}</p>
                    <p class="teacher-name">ผู้สอน: ${classData.teacherName}</p>
                </div>
                <div class="class-actions">
                    <button onclick="viewClass('${doc.id}')" class="secondary-btn">ดูรายละเอียด</button>
                    <button onclick="deleteClass('${doc.id}')" class="delete-btn">ลบห้องเรียน</button>
                </div>
            `;
            classList.appendChild(classDiv);
        });
    } catch (error) {
        console.error("Error loading classes:", error);
        classList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// ลบห้องเรียน
async function deleteClass(classId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบห้องเรียนนี้?')) {
        return;
    }

    try {
        await db.collection('classes').doc(classId).delete();
        alert('ลบห้องเรียนสำเร็จ');
        loadClasses(auth.currentUser.uid);
    } catch (error) {
        console.error("Error deleting class:", error);
        alert('เกิดข้อผิดพลาดในการลบห้องเรียน');
    }
}

// จัดการการแก้ไขชื่อ
document.getElementById('editNameBtn').addEventListener('click', () => {
    document.getElementById('displayName').style.display = 'none';
    document.getElementById('editNameForm').style.display = 'block';
    const currentName = document.getElementById('userName').textContent;
    if (currentName !== 'ยังไม่ได้ตั้งชื่อ') {
        document.getElementById('newName').value = currentName;
    }
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('displayName').style.display = 'block';
    document.getElementById('editNameForm').style.display = 'none';
});

document.getElementById('saveNameBtn').addEventListener('click', async () => {
    const newName = document.getElementById('newName').value.trim();
    if (!newName) {
        alert('กรุณาใส่ชื่อ');
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        await db.collection('users').doc(userId).update({
            displayName: newName
        });
        
        document.getElementById('userName').textContent = newName;
        document.getElementById('displayName').style.display = 'block';
        document.getElementById('editNameForm').style.display = 'none';
        alert('บันทึกชื่อเรียบร้อย');

        // อัพเดทชื่อในห้องเรียนทั้งหมด
        const classesSnapshot = await db.collection('classes')
            .where('teacherId', '==', userId)
            .get();
        
        const batch = db.batch();
        classesSnapshot.forEach(doc => {
            batch.update(doc.ref, { teacherName: newName });
        });
        await batch.commit();

    } catch (error) {
        console.error("Error updating name:", error);
        alert('เกิดข้อผิดพลาดในการบันทึกชื่อ');
    }
});

// ออกจากระบบ
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error signing out:", error);
        alert('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
});

// ดูรายละเอียดห้องเรียน
window.viewClass = function(classId) {
    window.location.href = `class-detail.html?id=${classId}`;
};

// ทำให้ฟังก์ชัน deleteClass เรียกใช้ได้จาก HTML
window.deleteClass = deleteClass;