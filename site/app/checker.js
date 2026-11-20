(function () {
  var lib = window.libphonenumber;
  var input = document.querySelector("#numbers");
  var country = document.querySelector("#country");
  var rows = document.querySelector("#rows");
  var summary = document.querySelector("#summary");
  var last = [];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function lineType(parsed) {
    var type = parsed.getType && parsed.getType();
    if (!type) return "unknown";
    return String(type).toLowerCase().replace(/_/g, " ");
  }

  function check() {
    if (!lib || !lib.parsePhoneNumberFromString) {
      summary.textContent = "The numbering-plan library did not load, so this page cannot classify numbers.";
      return;
    }
    var lines = input.value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
    var region = country.value;
    last = lines.map(function (raw) {
      var parsed = lib.parsePhoneNumberFromString(raw, region || undefined);
      if (!parsed) {
        return { raw: raw, ok: false, e164: "", country: "", type: "", label: "invalid" };
      }
      var valid = parsed.isValid();
      var possible = parsed.isPossible ? parsed.isPossible() : false;
      var label = valid ? "structurally valid" : possible ? "possible, not valid" : "invalid";
      return {
        raw: raw,
        ok: valid,
        e164: valid || possible ? parsed.number : "",
        country: parsed.country || "",
        type: lineType(parsed),
        label: label
      };
    });
    rows.innerHTML = last.map(function (row) {
      var cls = row.ok ? "ok" : "bad";
      return "<tr><td>" + escapeHtml(row.raw) + "</td><td class=\"" + cls + "\">" + escapeHtml(row.label) +
        "</td><td class=\"num\">" + escapeHtml(row.e164 || "—") + "</td><td>" + escapeHtml(row.country || "—") +
        "</td><td>" + escapeHtml(row.type || "—") + "</td></tr>";
    }).join("");
    var validCount = last.filter(function (row) { return row.ok; }).length;
    summary.textContent = validCount + " structurally valid of " + last.length + ". Numbering-plan result only — not a live-network check, and not a regulator block check.";
  }

  function download() {
    if (!last.length) check();
    var body = ["input,result,e164,country,line_type"].concat(last.map(function (row) {
      return [row.raw, row.label, row.e164, row.country, row.type].map(function (cell) {
        return "\"" + String(cell).replace(/"/g, "\"\"") + "\"";
      }).join(",");
    })).join("\n");
    var url = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    var link = document.createElement("a");
    link.href = url;
    link.download = "phone-number-checks.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  document.querySelector("#check").addEventListener("click", check);
  document.querySelector("#csv").addEventListener("click", download);
  check();
})();
