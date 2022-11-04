/* solhint-disable no-unused-vars*/
// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";

//  libraries
import { Address } from "@openzeppelin/contracts-0.8.x/utils/Address.sol";

// interfaces
import { IAdapter } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapter.sol";

/**
 * @title Adapter for UniswapV2 like pool
 * @author Opty.fi
 * @dev Abstraction layer to UniswapV2 pool forks
 */

contract UniswapV2ExchangeAdapter is IAdapter, AdapterModifiersBase {
    using Address for address;

    address public immutable wrappedNetworkToken;

    constructor(address _registry, address _wrappedNetworkToken) AdapterModifiersBase(_registry) {
        wrappedNetworkToken = _wrappedNetworkToken;
    }

    /**
     * @inheritdoc IAdapter
     */
    function getPoolValue(address _liquidityPool, address _underlyingToken) public view override returns (uint256) {
        // use oracle
        // add reserves of underlying token to the reserves of other token in underlying
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositSomeCodes(
        address payable,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    ) external view override returns (bytes[] memory) {
        // use oracle for min amount
        // swap underlying token to other token
    }

    /**
     * @inheritdoc IAdapter
     */
    function getDepositAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view override returns (bytes[] memory) {
        return getDepositSomeCodes(_vault, _underlyingToken, _liquidityPool, ERC20(_underlyingToken).balanceOf(_vault));
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawSomeCodes(
        address payable,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        // use oracle for min amount
        // swap other token to underlying token
    }

    /**
     * @inheritdoc IAdapter
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) external view override returns (bytes[] memory _codes) {
        return
            getWithdrawSomeCodes(
                _vault,
                _underlyingToken,
                _liquidityPool,
                getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool)
            );
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolToken(address _underlyingToken, address _liquidityPool) public view returns (address) {
        // return token other than _underlyingToken
    }

    /**
     * @inheritdoc IAdapter
     */
    function getUnderlyingTokens(address _liquidityPool, address _liquidityPoolToken)
        external
        view
        override
        returns (address[] memory _underlyingTokens)
    {
        // return token other than _liquidityPoolToken
    }

    /**
     * @inheritdoc IAdapter
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        return
            getSomeAmountInToken(
                _underlyingToken,
                _liquidityPool,
                getLiquidityPoolTokenBalance(_vault, _underlyingToken, _liquidityPool)
            );
    }

    /**
     * @inheritdoc IAdapter
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool
    ) public view override returns (uint256) {
        // balance of other token and not the underlyingToken
    }

    /**
     * @inheritdoc IAdapter
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _liquidityPoolTokenAmount
    ) public view override returns (uint256) {
        // use oracle
        // amount of other token (_liquidityPoolTokenAmount) in underlying token
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateAmountInLPToken(
        address _underlyingToken,
        address _liquidityPool,
        uint256 _underlyingTokenAmount
    ) external view override returns (uint256) {
        // use oracle
        // amount of _underlyingToken (_underlyingTokenAmount) in other token other token
    }

    /**
     * @inheritdoc IAdapter
     */
    function calculateRedeemableLPTokenAmount(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (uint256 _amount) {}

    /**
     * @inheritdoc IAdapter
     */
    function isRedeemableAmountSufficient(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        uint256 _redeemAmount
    ) external view override returns (bool) {}

    /**
     * @inheritdoc IAdapter
     */
    function getRewardToken(address) external pure override returns (address) {
        return address(0);
    }

    /**
     * @inheritdoc IAdapter
     */
    function canStake(address) external pure override returns (bool) {
        return false;
    }
}
