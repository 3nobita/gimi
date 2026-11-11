
document.addEventListener("DOMContentLoaded", () => {

  // Mobile Sidebar
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const overlay = document.getElementById("sidebarOverlay");

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  menuToggle?.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  sidebarClose?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  // Custom Date Filter
  window.toggleCustom = function(value) {
    const dates = document.getElementById("customDates");
    dates.classList.toggle("show", value === "custom");
  };

  // Chart Data
  const chartElement = document.getElementById("salesChart");
  const chartDataElement = document.getElementById("analytics-chart-data");

  if (!chartElement || !chartDataElement || typeof Chart === "undefined") {
    return;
  }

  let chartData = [];

  try {
    chartData = JSON.parse(chartDataElement.textContent || "[]");
  } catch (error) {
    console.error("Invalid analytics chart data:", error);
  }

  const ctx = chartElement.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(102, 88, 232, 0.25)");
  gradient.addColorStop(1, "rgba(102, 88, 232, 0.00)");

  new Chart(ctx, {
    type: "line",

    data: {
      labels: chartData.map(item => item.sale_date),

      datasets: [{
        label: "Sales Revenue",
        data: chartData.map(item => Number(item.sales) || 0),

        borderColor: "#6658e8",
        backgroundColor: gradient,

        borderWidth: 2.5,
        fill: true,
        tension: 0.4,

        pointRadius: 3,
        pointHoverRadius: 7,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#6658e8",
        pointBorderWidth: 2,

        pointHoverBackgroundColor: "#6658e8",
        pointHoverBorderColor: "#ffffff"
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: "index"
      },

      animation: {
        duration: 1100,
        easing: "easeOutQuart"
      },

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          backgroundColor: "#10182b",
          titleColor: "#ffffff",
          bodyColor: "#cbd5e1",
          padding: 13,
          cornerRadius: 9,
          displayColors: false,

          callbacks: {
            label: function(context) {
              return " Revenue: ₹" + Number(context.raw).toLocaleString("en-IN");
            }
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          },
          border: {
            display: false
          },
          ticks: {
            color: "#929bad",
            font: {
              size: 10
            }
          }
        },

        y: {
          beginAtZero: true,
          border: {
            display: false,
            dash: [4, 4]
          },
          grid: {
            color: "#f0f1f6"
          },
          ticks: {
            color: "#929bad",
            font: {
              size: 10
            },

            callback: function(value) {
              return "₹" + Number(value).toLocaleString("en-IN");
            }
          }
        }
      }
    }
  });

});
