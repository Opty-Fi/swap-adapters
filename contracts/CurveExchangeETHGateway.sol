// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

// library
import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";

//  interfaces
import { IERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import { IWETH } from "@optyfi/defi-legos/interfaces/misc/contracts/IWETH.sol";
import { IETHGateway } from "@optyfi/defi-legos/interfaces/misc/contracts/IETHGateway.sol";
import { ICurveETHSwapV1 as ICurveETHSwap } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveETHSwapV1.sol";
import { ICurveRegistryExchange } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveRegistryExchange.sol";

/**
 * @title ETH gateway for opty-fi's Curve Exchange adapter
 * @author Opty.fi
 * @dev Inspired from Aave WETH gateway
 */
contract CurveExchangeETHGateway is IETHGateway, AdapterModifiersBase {
    using SafeERC20 for ERC20;

    /* solhint-disable var-name-mixedcase*/
    IWETH internal immutable WETH;

    /** @notice address of the curve registry exchange */
    ICurveRegistryExchange public immutable CurveRegistryExchange;

    /** @notice address of the curve registry exchange */
    mapping(address => bool) public ethPools;

    /*solhint-enable var-name-mixedcase*/

    /**
     * @dev Initializes the WETH address, registry and curve's Eth pools
     * @param _weth Address of the Wrapped Ether contract
     * @param _registry Address of the registry
     * @param _curveRegistryExchange n
     * @param _ethPools Array of Curve's Eth pools
     **/
    constructor(
        address _weth,
        address _registry,
        ICurveRegistryExchange _curveRegistryExchange,
        address[4] memory _ethPools
    ) AdapterModifiersBase(_registry) {
        WETH = IWETH(_weth);
        CurveRegistryExchange = _curveRegistryExchange;
        for (uint256 _i = 0; _i < _ethPools.length; _i++) {
            ethPools[_ethPools[_i]] = true;
        }
        ethPools[address(_curveRegistryExchange)] = true;
    }

    function setEthPools(address[] memory _pools) external onlyOperator {
        uint256 _len = _pools.length;
        for (uint256 _i; _i < _len; _i++) {
            ethPools[_pools[_i]] = true;
        }
    }

    function unsetEthPools(address[] memory _pools) external onlyOperator {
        uint256 _len = _pools.length;
        for (uint256 _i; _i < _len; _i++) {
            ethPools[_pools[_i]] = false;
        }
    }

    /**
     * @inheritdoc IETHGateway
     */
    function depositETH(
        address _vault,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint256[2] memory _amounts,
        int128 _tokenIndex
    ) external override {
        IERC20(address(WETH)).transferFrom(_vault, address(this), _amounts[uint256(int256(_tokenIndex))]);
        WETH.withdraw(_amounts[uint256(int256(_tokenIndex))]);
        uint256 _minAmount = (_amounts[uint256(int256(_tokenIndex))] * 10**18 * 9500) /
            (ICurveETHSwap(_liquidityPool).get_virtual_price() * 10000);
        ICurveETHSwap(_liquidityPool).add_liquidity{ value: address(this).balance }(_amounts, _minAmount);
        IERC20(_liquidityPoolToken).transfer(_vault, IERC20(_liquidityPoolToken).balanceOf(address(this)));
    }

    /**
     * @inheritdoc IETHGateway
     */
    function withdrawETH(
        address _vault,
        address _liquidityPool,
        address _liquidityPoolToken,
        uint256 _amount,
        int128 _tokenIndex
    ) external override {
        IERC20(_liquidityPoolToken).transferFrom(_vault, address(this), _amount);
        uint256 _minAmount = (ICurveETHSwap(_liquidityPool).calc_withdraw_one_coin(_amount, _tokenIndex) * 9900) /
            (10000);
        ICurveETHSwap(_liquidityPool).remove_liquidity_one_coin(_amount, _tokenIndex, _minAmount);
        WETH.deposit{ value: address(this).balance }();
        IERC20(address(WETH)).transfer(_vault, IERC20(address(WETH)).balanceOf(address(this)));
    }

    function depositETHExchange(
        address _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _inputTokenAmount,
        uint256 _expectedAmount
    ) external {
        IERC20(address(WETH)).transferFrom(_vault, address(this), _inputTokenAmount);
        WETH.withdraw(_inputTokenAmount);
        CurveRegistryExchange.exchange{ value: _inputTokenAmount }(
            _liquidityPool,
            _inputToken,
            _outputToken,
            _inputTokenAmount,
            _expectedAmount,
            _vault
        );
    }

    function withdrawETHExchange(
        address _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _outputTokenAmount,
        uint256 _expectedAmount
    ) external {
        IERC20(_outputToken).transferFrom(_vault, address(this), _outputTokenAmount);
        ERC20(_outputToken).safeApprove(address(CurveRegistryExchange), _outputTokenAmount);
        CurveRegistryExchange.exchange(_liquidityPool, _outputToken, _inputToken, _outputTokenAmount, _expectedAmount);
        WETH.deposit{ value: address(this).balance }();
        IERC20(address(WETH)).transfer(_vault, IERC20(address(WETH)).balanceOf(address(this)));
    }

    /**
     * @inheritdoc IETHGateway
     */
    function emergencyTokenTransfer(
        address _token,
        address _to,
        uint256 _amount
    ) external override onlyOperator {
        IERC20(_token).transfer(_to, _amount);
    }

    /**
     * @inheritdoc IETHGateway
     */
    function emergencyEtherTransfer(address to, uint256 amount) external override onlyOperator {
        _safeTransferETH(to, amount);
    }

    /**
     * @inheritdoc IETHGateway
     */
    function getWETHAddress() external view override returns (address) {
        return address(WETH);
    }

    /**
     * @dev transfer ETH to an address, revert if it fails.
     * @param _to recipient of the transfer
     * @param _value the amount to send
     */
    function _safeTransferETH(address _to, uint256 _value) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool _success, ) = _to.call{ value: _value }(new bytes(0));
        require(_success, "ETH_TRANSFER_FAILED");
    }

    /**
     * @dev Only WETH and ethPool contracts are allowed to transfer ETH here. Prevent other addresses
     *      to send Ether to this contract.
     */
    receive() external payable {
        require(msg.sender == address(WETH) || ethPools[msg.sender], "Receive not allowed");
    }

    /**
     * @dev Revert fallback calls
     */
    fallback() external payable {
        revert("Fallback not allowed");
    }
}
