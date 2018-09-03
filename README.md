<div align="center"><img src="./miscellaneous/logo/logo_mid_hor_wht.png"><br></div>
 
### A non-profit, decentralized, open-source platform for the discussion of facts owned and operated by its users.

[![Join the chat at https://gitter.im/horus_ethereum/Lobby](https://badges.gitter.im/horus_ethereum/Lobby.svg)](https://gitter.im/horus_ethereum/Lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Click-driven monetization, along with other factors, seems to be creating economic incentives for media companies to consider honesty and unbiased accuracy irrelevant. This makes misinformation viral, putting people under sensationalistic enslavement.
 
 **Horus's goal is to help people filter the truth out of uncertainty.**
 * Horus is based on the Interplanetary File System (IPFS) and the Ethereum Blockchain. This makes it freer and censorship-resistant.
* Horus's mechanics promote unbiased and evidence-based judgment and attempt to make malicious bot frauds useless.

### Testing Horus

*Horus Beta will soon be deployed to a testnet.*

To test Horus locally with truffle, ganache, and npm run  the following commands on the repository:
Initialize ganache.
```
ganache-cli
```
Compile the solidity contracts.
```
truffle compile
```
Deploy the contracts to ganache.
```
truffle migrate
```
Start the web app.
```
npm run dev
```
Run ```truffle.cmd```  instead of   ```truffle``` if you are using Windows.

Select Localhost 8545 in metamask and log in with the credentials provided by ganache.
Click on the message on the heading to get reputation for testing.

### About the code
At first sight, you could think the first version of the code was written by someone who had little to no experience in Solidity/Javascript/Web Design but, if you study it closely, you will realize you are absolutely right.

The initial development of Horus followed the "learn and design along the way" approach, which, despite being a bad decision from a code-quality point of view, was much more fun.

I have been working to make the code more readable and elegant and will continue doing so (at the time of writing, there is still a lot to do).

### Notes  
* Horus is still on an early version. Not all functionalities have been tested nor security has been audited.
* There may be significant modifications on Horus' mechanics in the near future.
* The tests folder is empty. I know it would be a lot cooler if it weren't, I'm working on it.
* Horus uses unusual mechanics which may be confusing, I will try to post an in-depth explanation of those as soon as possible.
* Misspellings may be abundant, especially on code comments.