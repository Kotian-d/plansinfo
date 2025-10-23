$(document).ready(function () {
  $(".select2-multi").select2({
    placeholder: "Choose or add tags",
    tags: true,
    tokenSeparators: [",", " "],
  });
});

/*
function filterTable() {
  var input = document.getElementById("tableFilterInput");
  var filter = input.value.toLowerCase();
  var table = document.getElementById("resultsTable"); // assign an id to your table!
  var trs = table.getElementsByTagName("tr");
  for (var i = 1; i < trs.length; i++) {
    // skip header row
    var tds = trs[i].getElementsByTagName("td");
    var showRow = false;
    for (var j = 0; j < tds.length; j++) {
      if (tds[j] && tds[j].textContent.toLowerCase().indexOf(filter) > -1) {
        showRow = true;
        break;
      }
    }
    trs[i].style.display = showRow ? "" : "none";
  }
}*/
$(document).ready(function () {
  $("#prepaidtableFilterInput").on("input", function () {
    let query = $(this).val();

    $.ajax({
      url: "/prepaidplans/search",
      method: "GET",
      data: { q: query },
      success: function (data) {
        let tableBody = $("#tableBody");
        tableBody.empty();
        data.forEach((record) => {
          let row = `
              <tr>
                <td>${record.title}</td>
                <td>${record.description}</td>
                <td>${record.validity}</td>
                <td>${record.operator.name}</td>
                <td>${record.amount}</td>
                <td>${record.tags
                  .map(
                    (t) =>
                      '<span class="badge bg-primary">' + t.name + "</span>"
                  )
                  .join(" ")}</td>
                <td>
                  <a href="/prepaidplans/edit/${
                    record._id
                  }" class="btn btn-sm btn-warning">Edit</a>
                  <form action="/prepaidplans/delete/${
                    record._id
                  }" method="POST" style="display:inline;">
                    <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Delete this entry?');">Delete</button>
                  </form>
                </td>
              </tr>`;
          tableBody.append(row);
        });
      },
      error: function () {
        alert("Failed to fetch search results");
      },
    });
  });
});

$(document).ready(function () {
  $("#dthTableFilterInput").on("input", function () {
    let query = $(this).val();

    $.ajax({
      url: "/dthplans/search",
      method: "GET",
      data: { q: query },
      success: function (data) {
        let tableBody = $("#dthtableBody");
        tableBody.empty();
        data.forEach((entry) => {
          let row = `
              <tr>
                <td>${entry.title}</td>
                <td>${entry.description}</td>
                <td>${entry.operator.name}</td>
                <td>${entry.amount1month}</td>
                <td>${entry.amount3month}</td>
                <td>${entry.amount6month}</td>
                <td>${entry.amount12month}</td>
                <td>
                  <a href="/dthplans/edit/${entry._id}" class="btn btn-sm btn-warning">Edit</a>
                  <form action="/dthplans/delete/${entry._id}" method="POST" style="display:inline;">
                    <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Delete this entry?');">Delete</button>
                  </form>
                </td>
              </tr>`;
          tableBody.append(row);
        });
      },
      error: function () {
        alert("Failed to fetch search results");
      },
    });
  });
});

document
  .getElementById("passwordChangeForm")
  .addEventListener("submit", function (e) {
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (newPassword !== confirmPassword) {
      e.preventDefault();
      alert("New password and confirmation do not match.");
    }
  });

  function filterByOperator() {
  const select = document.getElementById('operatorFilter');
  const filter = select.value.toUpperCase();
  const table = document.getElementById('resultsTable');
  const tr = table.getElementsByTagName('tr');

  for (let i = 1; i < tr.length; i++) {  // start at 1 to skip header row
    const td = tr[i].getElementsByTagName('td')[2]; // Operator is 3rd column (index 2)
    if (td) {
      const txtValue = td.textContent || td.innerText;
      tr[i].style.display = filter === "" || txtValue.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }
  }
}
