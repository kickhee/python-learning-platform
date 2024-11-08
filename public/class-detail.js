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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// เช็คการล็อกอิน
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        if (classId) {
            loadClassDetails(classId);
            loadClassStats(classId);
            loadProblems(classId);
            loadStudents(classId);
        } else {
            alert('ไม่พบรหัสห้องเรียน');
            window.location.href = 'teacher-dashboard.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const createProblemBtn = document.getElementById('createProblemBtn');
    const problemBankBtn = document.getElementById('problemBankBtn');
    const createProblemForm = document.getElementById('createProblemForm');

    if (createProblemBtn) {
        createProblemBtn.addEventListener('click', function() {
            showCreateProblemModal();
        });
    }

    if (problemBankBtn) {
        problemBankBtn.addEventListener('click', function() {
            document.getElementById('problemBankModal').style.display = 'block';
            loadProblemBank(); // เรียกฟังก์ชันโหลดคลังโจทย์
        });
    }

    if (createProblemForm) {
        createProblemForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createProblem();
        });
    }
});

// โหลดข้อมูลห้องเรียน
async function loadClassDetails(classId) {
    try {
        const classDoc = await db.collection('classes').doc(classId).get();
        if (!classDoc.exists) {
            alert('ไม่พบห้องเรียน');
            window.location.href = 'teacher-dashboard.html';
            return;
        }

        const classData = classDoc.data();
        document.getElementById('className').textContent = classData.name;
        document.getElementById('classCode').textContent = `รหัสห้องเรียน: ${classData.code}`;
    } catch (error) {
        console.error("Error loading class details:", error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน');
    }
}

// โหลดสถิติห้องเรียน
async function loadClassStats(classId) {
    try {
        const studentCount = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);
        
        const problemCount = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);
            
        const submissionCount = await db.collection('submissions')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);

        document.getElementById('studentCount').textContent = studentCount;
        document.getElementById('problemCount').textContent = problemCount;
        document.getElementById('submissionCount').textContent = submissionCount;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// โหลดรายการโจทย์
// เพิ่มตัวแปรเก็บข้อมูลโจทย์ทั้งหมด
let allProblems = [];

// ฟังก์ชัน loadProblems
async function loadProblems(classId) {
    const problemList = document.getElementById('problemList');
    try {
        const snapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (snapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียน</p>';
            allProblems = [];
            return;
        }

        const problemPromises = snapshot.docs.map(async (doc) => {
            try {
                const problemDoc = await db.collection('problems')
                    .doc(doc.data().problemId)
                    .get();
                
                if (!problemDoc.exists) {
                    // ถ้าไม่พบโจทย์ ให้ลบความสัมพันธ์นี้ออก
                    await doc.ref.delete();
                    return null;
                }
                
                return { id: problemDoc.id, ...problemDoc.data() };
            } catch (error) {
                console.error("Error loading problem:", error);
                return null;
            }
        });

        const problems = (await Promise.all(problemPromises))
            .filter(problem => problem !== null); // กรองเอาเฉพาะโจทย์ที่ยังมีอยู่

        allProblems = problems;
        displayProblems(problems);
    } catch (error) {
        console.error("Error loading problems:", error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดโจทย์</p>';
    }
}

// เพิ่มฟังก์ชันแสดงโจทย์
function displayProblems(problems) {
    const problemList = document.getElementById('problemList');
    problemList.innerHTML = '';

    if (problems.length === 0) {
        problemList.innerHTML = '<p>ไม่พบโจทย์</p>';
        return;
    }
    
    problems.forEach(problem => {
        const problemDiv = document.createElement('div');
        problemDiv.className = 'problem-card';
        problemDiv.innerHTML = `
            <div class="problem-info">
                <h3>${problem.title}</h3>
                <p>${problem.description || ''}</p>
            </div>
            <div class="problem-actions">
                <button onclick="editProblem('${problem.id}', ${JSON.stringify(problem).replace(/"/g, '&quot;')})" class="edit-btn">
                    แก้ไข
                </button>
                <button onclick="deleteProblem('${problem.id}')" class="delete-btn">ลบ</button>
            </div>
        `;
        problemList.appendChild(problemDiv);
    });
}

// เพิ่มฟังก์ชันค้นหา
function searchProblems(searchText) {
    if (!searchText) {
        displayProblems(allProblems);
        return;
    }

    const searchLower = searchText.toLowerCase();
    const filteredProblems = allProblems.filter(problem => 
        problem.title.toLowerCase().includes(searchLower) ||
        problem.description.toLowerCase().includes(searchLower)
    );

    displayProblems(filteredProblems);
}

// เพิ่ม Event Listener สำหรับการค้นหา
document.addEventListener('DOMContentLoaded', function() {
    // เพิ่ม event listener สำหรับช่องค้นหา
    const searchInput = document.getElementById('searchProblem');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProblems(e.target.value);
        });
    }

    // Event Listeners อื่นๆ ที่มีอยู่เดิม...
});

// โหลดรายชื่อนักเรียน
async function loadStudents(classId) {
    const studentList = document.getElementById('studentList');
    try {
        const enrollments = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get();

        if (enrollments.empty) {
            studentList.innerHTML = '<p>ยังไม่มีนักเรียนในห้องเรียน</p>';
            return;
        }

        const studentPromises = enrollments.docs.map(async (enrollment) => {
            const studentDoc = await db.collection('users')
                .doc(enrollment.data().studentId)
                .get();
            return { id: studentDoc.id, ...studentDoc.data() };
        });

        const students = await Promise.all(studentPromises);
        studentList.innerHTML = '';
        
        students.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.className = 'student-card';
            studentDiv.innerHTML = `
                <div class="student-info">
                    <h3>${student.displayName || 'ไม่ระบุชื่อ'}</h3>
                    <p>${student.email}</p>
                </div>
                <div class="student-actions">
                    <button onclick="viewProgress('${student.id}')" class="secondary-btn">ดูความคืบหน้า</button>
                    <button onclick="removeStudent('${student.id}')" class="delete-btn">นำออก</button>
                </div>
            `;
            studentList.appendChild(studentDiv);
        });
    } catch (error) {
        console.error("Error loading students:", error);
        studentList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดรายชื่อนักเรียน</p>';
    }
}


// ฟังก์ชันสร้างหรือแก้ไขโจทย์
async function createProblem() {
    try {
        const form = document.getElementById('createProblemForm');
        const problemId = form.getAttribute('data-problem-id');
        const isEditing = !!problemId;
        const classId = new URLSearchParams(window.location.search).get('id');

        // เตรียมข้อมูลโจทย์
        const problemData = {
            title: document.getElementById('problemTitle').value,
            description: document.getElementById('problemDescription').value,
            templateCode: document.getElementById('templateCode').value,
            teacherId: auth.currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!isEditing) {
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            problemData.classNames = [];
        }

        // รวบรวม test cases
        const testCases = [];
        document.querySelectorAll('.test-case').forEach(testCase => {
            const input = testCase.querySelector('.test-input').value;
            const output = testCase.querySelector('.test-output').value;
            if (input && output) {
                try {
                    testCases.push({
                        input: JSON.parse(input),
                        expected: JSON.parse(output)
                    });
                } catch (error) {
                    console.error('Invalid test case format:', error);
                }
            }
        });
        problemData.testCases = testCases;

        if (isEditing) {
            // แก้ไขโจทย์
            await db.collection('problems').doc(problemId).update(problemData);
            alert('อัพเดทโจทย์สำเร็จ');
            closeCreateProblemModal();
            await loadProblems(classId);
        } else {
            // สร้างโจทย์ใหม่
            const problemRef = await db.collection('problems').add(problemData);

            // เพิ่มเข้าห้องเรียน
            await db.collection('class_problems').add({
                problemId: problemRef.id,
                classId: classId,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // อัพเดท classNames
            const classDoc = await db.collection('classes').doc(classId).get();
            await problemRef.update({
                classNames: firebase.firestore.FieldValue.arrayUnion(classDoc.data().name)
            });
            
            alert('สร้างโจทย์สำเร็จ');
            closeCreateProblemModal();
            
            // โหลดข้อมูลใหม่ทั้งหมดพร้อมกัน
            await Promise.all([
                loadProblems(classId),
                loadClassStats(classId),
                loadProblemBank()
            ]);
        }

    } catch (error) {
        console.error('Error saving problem:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกโจทย์: ' + error.message);
    }
}
// เพิ่มฟังก์ชันลบโจทย์
async function deleteProblem(problemId) {
    // ถามก่อนลบ
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโจทย์นี้?')) {
        return;
    }

    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // ลบจาก class_problems ก่อน
        const classProblemsSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .where('problemId', '==', problemId)
            .get();

        const batch = db.batch();
        classProblemsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // ลบโจทย์จาก problems
        batch.delete(db.collection('problems').doc(problemId));

        // ดำเนินการลบ
        await batch.commit();

        alert('ลบโจทย์สำเร็จ');
        
        // โหลดรายการโจทย์ใหม่
        loadProblems(classId);
        // อัพเดทสถิติ
        loadClassStats(classId);

    } catch (error) {
        console.error('Error deleting problem:', error);
        alert('เกิดข้อผิดพลาดในการลบโจทย์');
    }
}

// ฟังก์ชันจัดการ Test Cases
function addTestCase() {
    const testCaseHTML = `
        <div class="test-case">
            <div class="form-group">
                <label>Input</label>
                <input type="text" class="test-input" placeholder='{"x": 1, "y": 2}'>
            </div>
            <div class="form-group">
                <label>Expected Output</label>
                <input type="text" class="test-output" placeholder="3">
            </div>
            <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ</button>
        </div>
    `;
    document.getElementById('testCasesList').insertAdjacentHTML('beforeend', testCaseHTML);
}

function removeTestCase(button) {
    button.parentElement.remove();
}

// ฟังก์ชันแสดง/ซ่อน Modal
function showCreateProblemModal() {
    document.getElementById('createProblemModal').style.display = 'block';
}

// แก้ไขฟังก์ชันปิด Modal
function closeCreateProblemModal() {
    const modal = document.getElementById('createProblemModal');
    const form = document.getElementById('createProblemForm');
    
    // รีเซ็ตฟอร์ม
    form.reset();
    form.removeAttribute('data-problem-id');
    
    // รีเซ็ตหัวข้อ Modal
    document.querySelector('#createProblemModal .modal-content h2').textContent = 'สร้างโจทย์ใหม่';
    
    // ซ่อน Modal
    modal.style.display = 'none';
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// ฟังก์ชันแก้ไขโจทย์
function editProblem(problemId, problemData) {
    // เปลี่ยนหัวข้อ Modal
    document.querySelector('#createProblemModal .modal-content h2').textContent = 'แก้ไขโจทย์';
    
    // เก็บ problemId ไว้ใน form
    const form = document.getElementById('createProblemForm');
    form.setAttribute('data-problem-id', problemId);

    // นำข้อมูลเดิมใส่ในฟอร์ม
    document.getElementById('problemTitle').value = problemData.title;
    document.getElementById('problemDescription').value = problemData.description;
    document.getElementById('templateCode').value = problemData.templateCode || '';

    // ล้างและเพิ่ม test cases เดิม
    const testCasesList = document.getElementById('testCasesList');
    testCasesList.innerHTML = '';
    
    if (problemData.testCases && problemData.testCases.length > 0) {
        problemData.testCases.forEach(testCase => {
            const testCaseHTML = `
                <div class="test-case">
                    <div class="form-group">
                        <label>Input</label>
                        <input type="text" class="test-input" value='${JSON.stringify(testCase.input)}'>
                    </div>
                    <div class="form-group">
                        <label>Expected Output</label>
                        <input type="text" class="test-output" value='${JSON.stringify(testCase.expected)}'>
                    </div>
                    <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ</button>
                </div>
            `;
            testCasesList.insertAdjacentHTML('beforeend', testCaseHTML);
        });
    }

    // แสดง Modal
    document.getElementById('createProblemModal').style.display = 'block';
}


// ฟังก์ชันอัพเดทโจทย์
async function updateProblem(problemId) {
    try {
        const problemData = {
            title: document.getElementById('problemTitle').value,
            description: document.getElementById('problemDescription').value,
            templateCode: document.getElementById('templateCode').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // รวบรวม test cases
        const testCases = [];
        document.querySelectorAll('.test-case').forEach(testCase => {
            const input = testCase.querySelector('.test-input').value;
            const output = testCase.querySelector('.test-output').value;
            if (input && output) {
                try {
                    testCases.push({
                        input: JSON.parse(input),
                        expected: JSON.parse(output)
                    });
                } catch (error) {
                    console.error('Invalid test case format:', error);
                }
            }
        });
        problemData.testCases = testCases;

        // อัพเดทข้อมูลใน Firestore - แก้ไขเฉพาะโจทย์เดิม
        await db.collection('problems').doc(problemId).update(problemData);

        alert('อัพเดทโจทย์สำเร็จ');
        closeCreateProblemModal();

        // รีโหลดรายการโจทย์
        const classId = new URLSearchParams(window.location.search).get('id');
        loadProblems(classId);

    } catch (error) {
        console.error('Error updating problem:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทโจทย์');
    }
}
async function addProblemToClass(problemId) {
    try {
        const classId = new URLSearchParams(window.location.search).get('id');
        
        // เพิ่มความสัมพันธ์ระหว่างโจทย์กับห้องเรียน
        await db.collection('class_problems').add({
            problemId: problemId,
            classId: classId,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // อัพเดท classNames ในโจทย์
        const classDoc = await db.collection('classes').doc(classId).get();
        await db.collection('problems').doc(problemId).update({
            classNames: firebase.firestore.FieldValue.arrayUnion(classDoc.data().name)
        });

        alert('เพิ่มโจทย์เข้าห้องเรียนสำเร็จ');
        
        // รีโหลดคลังโจทย์และรายการโจทย์
        loadProblemBank();
        loadProblems(classId);
        loadClassStats(classId);
        
    } catch (error) {
        console.error('Error adding problem to class:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มโจทย์');
    }
}
// ฟังก์ชันโหลดคลังโจทย์
async function loadProblemBank() {
    const problemBankList = document.getElementById('problemBankList');
    if (!problemBankList) return; // ป้องกันกรณีไม่พบ element

    try {
        // ดึงข้อมูลห้องเรียนปัจจุบัน
        const currentClassId = new URLSearchParams(window.location.search).get('id');
        if (!currentClassId) {
            throw new Error('ไม่พบรหัสห้องเรียน');
        }

        const currentClass = await db.collection('classes').doc(currentClassId).get();
        if (!currentClass.exists) {
            throw new Error('ไม่พบข้อมูลห้องเรียน');
        }

        const currentClassName = currentClass.data().name;

        // ดึงโจทย์ของครูท่านนี้
        const problemsSnapshot = await db.collection('problems')
            .where('teacherId', '==', auth.currentUser.uid)
            .get();

        // ดึงความสัมพันธ์ระหว่างโจทย์กับห้องเรียนปัจจุบัน
        const classProblemSnapshot = await db.collection('class_problems')
            .where('classId', '==', currentClassId)
            .get();

        // สร้าง Set ของ problemId ที่มีในห้องเรียนนี้แล้ว
        const existingProblemIds = new Set(
            classProblemSnapshot.docs.map(doc => doc.data().problemId)
        );

        // กรองโจทย์ที่ยังไม่มีในห้องเรียนนี้
        const availableProblems = problemsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(problem => !existingProblemIds.has(problem.id));

        // แสดงผล
        if (availableProblems.length === 0) {
            problemBankList.innerHTML = '<p>ไม่พบโจทย์ที่สามารถเพิ่มได้</p>';
            return;
        }

        let html = '';
        availableProblems.forEach(problem => {
            html += `
                <div class="problem-bank-item">
                    <div class="problem-info">
                        <h3>${problem.title}</h3>
                        <p>${problem.description || ''}</p>
                        ${problem.classNames && problem.classNames.length > 0 ? 
                            `<p class="used-in">ใช้ในห้อง: ${problem.classNames.join(', ')}</p>` : 
                            '<p class="not-used">ยังไม่เคยใช้ในห้องใดๆ</p>'}
                    </div>
                    <div class="problem-actions">
                        <button onclick="addProblemToClass('${problem.id}')" class="primary-btn">เพิ่มในห้องเรียน</button>
                        <button onclick="deleteProblemFromBank('${problem.id}')" class="delete-btn">ลบออกจากคลัง</button>
                    </div>
                </div>
            `;
        });

        problemBankList.innerHTML = html;

    } catch (error) {
        console.error("Error loading problem bank:", error);
        problemBankList.innerHTML = `<p>เกิดข้อผิดพลาดในการโหลดคลังโจทย์: ${error.message}</p>`;
    }
}
async function deleteProblemFromBank(problemId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโจทย์นี้ออกจากคลัง? \nการลบจะไม่สามารถกู้คืนได้')) {
        return;
    }

    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // 1. ลบโจทย์จาก problems collection
        await db.collection('problems').doc(problemId).delete();

        // 2. ดึงและลบข้อมูลจาก class_problems
        const classProblemsQuery = await db.collection('class_problems')
            .where('problemId', '==', problemId)
            .get();

        // 3. ลบข้อมูลใน class_problems ที่เกี่ยวข้อง
        const deletePromises = classProblemsQuery.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        alert('ลบโจทย์สำเร็จ');
        
        // 4. โหลดข้อมูลใหม่
        loadProblemBank();
        loadProblems(classId);
        loadClassStats(classId);

    } catch (error) {
        console.error('Error deleting problem from bank:', error);
        alert('เกิดข้อผิดพลาดในการลบโจทย์');
    }
}


function closeProblemBankModal() {
    const modal = document.getElementById('problemBankModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// เพิ่มที่ Export functions
window.deleteProblem = deleteProblem;
window.showTab = showTab;
window.showCreateProblemModal = showCreateProblemModal;
window.closeCreateProblemModal = closeCreateProblemModal;
window.addTestCase = addTestCase;
window.removeTestCase = removeTestCase;
window.editProblem = editProblem;  // เพิ่มบรรทัดนี้
window.updateProblem = updateProblem;  // เพิ่มบรรทัดนี้
window.addProblemToClass = addProblemToClass;
window.closeProblemBankModal = closeProblemBankModal;
window.deleteProblemFromBank = deleteProblemFromBank;