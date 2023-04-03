const { expect, assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe("NFT Marketplace Unit Tests", function () {
          let nftMarketplace, deployer, player, basicNft, accounts
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async function () {
              accounts = await ethers.getSigners()
              //   deployer = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              player = accounts[1]

              await deployments.fixture("all")
              nftMarketplace = await ethers.getContract(
                  "NftMarketplace",
                  deployer
              )
              basicNft = await ethers.getContract("BasicNft", deployer)
              const txn = await basicNft.mintNft()
              await txn.wait(1)
          })
          describe("listItem", function () {
              it("reverts a PriceMustBeAboveZero error when the price is 0", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
                  //   console.log("xxx", accounts[0])
                  //   console.log("yyy", deployer)
              })
              it("reverts a NotApprovedForMarketplace error when the contract is not approved", async function () {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(
                      "NftMarketplace__NotApprovedForMarketpalce"
                  )
              })
              it("reverts a ALreadyListed error when the item is already listed", async function () {
                  basicNft.approve(nftMarketplace.address, TOKEN_ID)
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__AlreadyListed")
              })
              it("should be listed successfully", async function () {
                  basicNft.approve(nftMarketplace.address, TOKEN_ID)
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  const listing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.equal(listing.price.toString(), PRICE.toString())
                  assert.equal(listing.seller.toString(), deployer)
              })
          })
          describe("buy, cancel, update, withdraw", function () {
              beforeEach(async function () {
                  basicNft.approve(nftMarketplace.address, TOKEN_ID)
                  await nftMarketplace.listItem(
                      basicNft.address,
                      TOKEN_ID,
                      PRICE
                  )
              })
              describe("buyItem", function () {
                  it("reverts a NotListed error when the tokenId doesn't exist", async function () {
                      await expect(
                          nftMarketplace.buyItem(basicNft.address, "1")
                      ).to.be.revertedWith("NftMarketplace__NotListed")
                  })
                  it("reverts a PriceNotMet error when the value is lower than listing price", async function () {
                      const playerConnectedNftMarketplace =
                          await nftMarketplace.connect(player)
                      await expect(
                          playerConnectedNftMarketplace.buyItem(
                              basicNft.address,
                              TOKEN_ID,
                              { value: "10" }
                          )
                      ).to.be.revertedWith("NftMarketplace__PriceNotMet")
                  })
                  it("trasnfers the NFT to the player and shows the correct proceeds for the seller", async function () {
                      const playerConnectedNftMarketplace =
                          await nftMarketplace.connect(player)
                      expect(
                          await playerConnectedNftMarketplace.buyItem(
                              basicNft.address,
                              TOKEN_ID,
                              { value: PRICE }
                          )
                      ).to.emit("ItemBought")
                      const newOwner = await basicNft.ownerOf(TOKEN_ID)
                      const proceeds = await nftMarketplace.getProceeds(
                          deployer
                      )
                      assert.equal(newOwner, player.address)
                      assert.equal(proceeds.toString(), PRICE)
                  })
              })
              describe("cancelListing", function () {
                  it("must be an owner to cancel the listing", async function () {
                      const playerConnectedNftMarketplace =
                          nftMarketplace.connect(player)
                      await expect(
                          playerConnectedNftMarketplace.cancelListing(
                              basicNft.address,
                              TOKEN_ID
                          )
                      ).to.be.revertedWith("NftMarketplace__NotOwner")
                  })
                  it("must be listed to cancel the listing", async function () {
                      await nftMarketplace.cancelListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                      await expect(
                          nftMarketplace.cancelListing(
                              basicNft.address,
                              TOKEN_ID
                          )
                      ).to.be.revertedWith("NftMarketplace__NotListed")
                  })
                  it("successfully deletes the nft from the listing", async function () {
                      expect(
                          await nftMarketplace.cancelListing(
                              basicNft.address,
                              TOKEN_ID
                          )
                      ).to.emit("ItemCanceled")
                  })
              })
              describe("updateListing", function () {
                  it("successfully updates the price of the listed item", async function () {
                      expect(
                          await nftMarketplace.updateListing(
                              basicNft.address,
                              TOKEN_ID,
                              "10"
                          )
                      ).to.emit("ItemListed")
                      const listing = await nftMarketplace.getListing(
                          basicNft.address,
                          TOKEN_ID
                      )
                      assert.equal(listing.price.toString(), "10")
                  })
              })
              describe("withdrawProceeds", function () {
                  it("reverts a NoProceeds error when the proceeds is zero", async function () {
                      await expect(
                          nftMarketplace.withdrawProceeds()
                      ).to.be.revertedWith("NftMarketplace__NoProceeds")
                  })
                  it("successfully transfer the proceeds to withdrawer", async function () {
                      const playerConnectedNftMarketplace =
                          nftMarketplace.connect(player)
                      await playerConnectedNftMarketplace.buyItem(
                          basicNft.address,
                          TOKEN_ID,
                          { value: PRICE }
                      )
                      const balanceBefore = await accounts[0].getBalance()
                      const proceedsBefore = await nftMarketplace.getProceeds(
                          deployer
                      )
                      const txnResponse =
                          await nftMarketplace.withdrawProceeds()
                      const txnReceipt = await txnResponse.wait(1)
                      const { gasUsed, effectiveGasPrice } = txnReceipt
                      const gasCost = gasUsed.mul(effectiveGasPrice)
                      const proceeds = await nftMarketplace.getProceeds(
                          deployer
                      )
                      const balanceAfter = await accounts[0].getBalance()
                      assert.equal(proceeds.toString(), "0")
                      assert.equal(
                          balanceAfter.add(gasCost).toString(),
                          balanceBefore.add(proceedsBefore).toString()
                      )
                  })
                  //   it("", async function () {})
              })
          })
      })
