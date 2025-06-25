import requests
print("1.Geo-code")
print("2.Reverse Geo-code")

choice = input("Enter your choice: ")
if choice == "1":
    print("You chose Geo-code")
    lon= input("Enter Longitude: ")
    lat = input("Enter Latitude: ")
    print("Starting the request...")
    z="http://127.0.0.1:5000/get_location/lon:{lon}/lat:{lat}".format(lon=lon, lat=lat)
    x = requests.get(z)
elif choice == "2":
    print("You chose Reverse Geo-code")
    address = input("Enter Address: ")
    print("Starting the request...")
    z="http://127.0.0.1:5000/get_coord/address:{address}".format(address=address)
    x = requests.get(z)
else:
    print("Invalid choice. Please enter 1 or 2.")
print(x.json)