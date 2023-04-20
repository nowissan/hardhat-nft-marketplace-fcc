const { ethers, network } = require("hardhat")
const fs = require("fs")

const frontEndContractsFile =
    "../nextjs-nft-marketplace-fcc/constants/networkMapping.json"
const frontEndAbiLocation = "../nextjs-nft-marketplace-fcc/constants/"

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updateing front end...")
        await updateContractAddresses(deployer)
        await updateAbi()
    }
}

async function updateAbi() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    fs.writeFileSync(
        `${frontEndAbiLocation}NftMarketplace.json`,
        nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
    )

    const basicNft = await ethers.getContract("BasicNft")
    fs.writeFileSync(
        `${frontEndAbiLocation}BasicNft.json`,
        basicNft.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses(deployer) {
    const nftMarketplace = await ethers.getContract("NftMarketplace", deployer)
    const chainId = network.config.chainId.toString()
    const contractAddresses = JSON.parse(
        fs.readFileSync(frontEndContractsFile, "utf8")
    )
    // console.log("------", chainId, contractAddresses, nftMarketplace)
    if (chainId in contractAddresses) {
        if (
            !contractAddresses[chainId]["NftMarketplace"].includes(
                nftMarketplace.address
            )
        ) {
            contractAddresses[chainId]["NftMarketplace"].push(
                nftMarketplace.address
            )
        }
    } else {
        contractAddresses[chainId] = {
            NftMarketplace: [nftMarketplace.address],
        }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
