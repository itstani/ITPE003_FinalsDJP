let stockQuantity = 5; //set stock value to 5

function onLoadSetValues() {
    document.getElementById("qty").innerHTML = stockQuantity; //set whatever stock value to be printed in the website when loaded
}

function AddToInventoryButton() {
    currentStock = stockQuantity; //retrieve stock amount and sets it as current stock
    currentStock -= 1; //update stock amount, remove 1 per button press
    stockQuantity = currentStock; //save new stock amount to the stockQuantity variable
    document.getElementById("qty").innerHTML = currentStock; //update the html displaying the stock amount
}