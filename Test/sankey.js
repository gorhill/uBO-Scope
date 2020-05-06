google.charts.load('current', {'packages':['sankey']});
google.charts.setOnLoadCallback(drawChart);

function drawChart() {
var data = new google.visualization.DataTable();
data.addColumn('string', 'From');
data.addColumn('string', 'To');
data.addColumn('number', 'Weight');
let includeBlocked = true;
for (let thing in scopeData) {
    if (thing.includes("month")) {
        let firstParties = scopeData[thing]["all1st"];
        let connections = scopeData[thing]["allConnected3rd"];
        let blocked = scopeData[thing]["allBlocked3rd"];
        console.log(blocked);
        console.log(connections);
        let total;
        if (includeBlocked) {
            total = connections.concat(blocked);
        } else {
            total = connections;
        }
        total.forEach(element => {
            element = element.split(" ");
            let temp = element[0];
            element[0] = element[1];
            element[1] = temp;
            element.push(1);
            if (!firstParties.includes(element[1])) {
                data.addRows([element]);
            }
        });
    }
}
// Sets chart options.
var options = {
    width: 600,
};

// Instantiates and draws our chart, passing in some options.
var chart = new google.visualization.Sankey(document.getElementById('sankey_basic'));
chart.draw(data, options);
}