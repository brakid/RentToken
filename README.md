# RentToken
DApp to manage rental properties (ownership, collecting rent)

## Tokenomics:
* the owner of the house creates an NFT to represent the object
* the owner locks the **HouseNft** in the RentToken contract and receives 100 **RentTokens**
* the owner sells the RentTokens = shares in the house
* the house is rented out to someone else, they have to pay rent (in USDC) every month
* the rent is sent to the RentToken contract. It splits the received rent according the the amounts of RentTokens held by the owners.
* the owners can claim the paid rent
* paying rent after the due date incurs a fee of 5 USDC per day
* RentTokens can be traded, previously unclaimed paid rent remains untouched by that
