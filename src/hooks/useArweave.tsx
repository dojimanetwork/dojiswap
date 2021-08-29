import Logo from '../assets/svg/logo_white.svg'
export async function ConnectToArWallet(setState: React.Dispatch<React.SetStateAction<string>>) {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS'], {
            logo: Logo,
            name: "Dojima network"
        })
        const address = await window.arweaveWallet.getActiveAddress()
        setState(address)
}