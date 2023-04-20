const { ethers, network, getNamedAccounts } = require("hardhat")
const { moveBlocks } = require("../utils/move-blocks")

// const PRICE = ethers.utils.parseEther("0.1")

async function mint() {
    const deployer = (await getNamedAccounts()).deployer
    // const nftMarketplace = await ethers.getContract("NftMarketplace", deployer)
    const basicNft = await ethers.getContract("BasicNft", deployer)

    console.log("Minting...")
    const mintTxn = await basicNft.mintNft()
    const mintTxnReceipt = await mintTxn.wait(1)
    const tokenId = mintTxnReceipt.events[0].args.tokenId
    console.log(`Got TokenID: ${tokenId}`)
    console.log(`NFT Address: ${basicNft.address}`)

    // console.log("Approving NFT...")
    // const approveReceipt = await basicNft.approve(
    //     nftMarketplace.address,
    //     tokenId
    // )
    // await approveReceipt.wait(1)

    // console.log("Listing NFT...")
    // const txn = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE)
    // await txn.wait(1)

    if (network.config.chainId == 31337) {
        await moveBlocks(2, (sleepAmount = 1000))
    }
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
