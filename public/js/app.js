document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.replace('/login.html');  
    }

    const getUserInfoFromToken = () => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1])); 
            return { id: payload.id || null, premium: payload.premium || false };
        } catch (error) {
            console.error("Error decoding token:", error);
            return { id: null, premium: false };
        }
    };

    const userInfo = getUserInfoFromToken();

    if (!userInfo.id) {
        window.location.replace("/login.html"); 
    }

    if (userInfo.premium) {
        document.getElementById('premium-features').style.display = 'block';
    } else {
        document.getElementById('upgrade-btn').style.display = 'block';
    }

    document.getElementById('expense-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const category = document.getElementById('category').value;

        try {
            const response = await fetch('/api/expenses/add', {
                method: 'POST',
                body: JSON.stringify({ amount, category }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();
            alert(data.message);
            document.getElementById('amount').value = ''; 
            fetchExpenses();
            fetchTotalExpense();
            if (userInfo.premium) fetchLeaderboard();
        } catch (err) {
            console.error('Error:', err);
        }
    });

    let currentPage = 1;

    const fetchExpenses = async () => {
        try {
            const response = await fetch(`/api/expenses/list?page=${currentPage}`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const expenses = await response.json();
            const expenseList = document.getElementById('expense-list');
            expenseList.innerHTML = '';

            expenses.forEach(expense => {
                const li = document.createElement('li');
                li.textContent = `${expense.category}: $${expense.amount}`;
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => deleteExpense(expense.id);
                li.appendChild(deleteButton);
                expenseList.appendChild(li);
            });

            loadPaginationControls();
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const loadPaginationControls = async () => {
        const paginationContainer = document.getElementById('pagination-controls');
        paginationContainer.innerHTML = '';
    
        const prevButton = document.createElement('button');
        prevButton.classList.add('btn', 'btn-secondary');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            currentPage--;
            fetchExpenses();
        };
        
        const nextButton = document.createElement('button');
        nextButton.classList.add('btn', 'btn-secondary');
        nextButton.textContent = 'Next';
        nextButton.onclick = () => {
            currentPage++;
            fetchExpenses();
        };
    
        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(nextButton);
    };
    
    const fetchTotalExpense = async () => {
        try {
            const response = await fetch(`/api/expenses/total`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            document.getElementById('total-expense').textContent = `$${data.total}`;
        } catch (err) {
            console.error('Error:', err);
        }
    };

    document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/purchase/premium', {  
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            const { orderId, key } = data;

            if (!orderId || !key || key === "undefined_key") {
                throw new Error(`Invalid key/orderId`); 
            }

            const options = {
                key, 
                amount: 49900, 
                currency: "INR",
                name: "Expense Tracker",
                description: "Upgrade to Premium",
                order_id: orderId,
                handler: async function (response) {
                    const verifyRes = await fetch('/api/purchase/verify', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        alert("Upgrade successful! Reloading...");
                        localStorage.setItem('token', verifyData.token);
                        window.location.reload();
                    } else {
                        alert("Upgrade failed. Please try again.");
                    }
                },
                prefill: {
                    name: "John Doe",
                    email: "john.doe@example.com",
                    contact: "9000000000"
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error('Error upgrading to premium:', err);
            alert(`Something went wrong. Debug: ${err.message}`);
        }
    });

    const fetchLeaderboard = async () => {
        try {
            const response = await fetch('/api/premium/leaderboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            const leaderboardList = document.getElementById('leaderboard');
            leaderboardList.innerHTML = '';

            data.forEach(user => {
                const li = document.createElement('li');
                li.textContent = `${user.name || "Unknown"}: $${user.totalExpense || 0}`;
                leaderboardList.appendChild(li);
            });
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        }
    };

    const deleteExpense = async (expenseId) => {
        try {
          const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.message === 'Expense deleted successfully') {
            alert("Expense deleted successfully");
            fetchExpenses();  // Re-fetch the list of expenses
          } else {
            alert("Error deleting expense");
          }
        } catch (error) {
          console.error("Error deleting expense:", error);
        }
    };

    document.getElementById('download-btn')?.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/premium/download', { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'expenses.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error('Error downloading expenses:', err);
            alert('Error downloading expenses. Please try again.');
        }
    });

    fetchExpenses();
    fetchTotalExpense();
    if (userInfo.premium) fetchLeaderboard();
});
