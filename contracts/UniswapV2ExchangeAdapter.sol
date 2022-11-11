/* solhint-disable no-unused-vars*/
// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";

//  libraries
import { Address } from "@openzeppelin/contracts-0.8.x/utils/Address.sol";

// interfaces
import { IAdapterV2 } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterV2.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IOptyFiOracle } from "./utils/optyfi-oracle/contracts/interfaces/IOptyFiOracle.sol";

/**
 * @title Adapter for UniswapV2 exchange
 * @author Opty.fi
 * @dev Abstraction layer to UniwapV2 and forks
 */

struct Slippage {
    address liquidityPool;
    address wantToken;
    uint256 slippage;
}

contract UniswapV2ExchangeAdapter is IAdapterV2, AdapterModifiersBase {
    using Address for address;

    /** @notice Denominator for basis points calculations */
    uint256 public constant DENOMINATOR = 10000;

    /*solhint-disable var-name-mixedcase*/
    /** @notice  address of uniswapb2 router */
    IUniswapV2Router02 public immutable UniswapV2Router;
    /*solhint-enable var-name-mixedcase*/

    /** @notice  address of the optyfi oracle */
    IOptyFiOracle public optyFiOracle;

    /** @notice Maps liquidity pool to want token to slippage */
    mapping(address => mapping(address => uint256)) public liquidityPoolToWantTokenToSlippage;

    constructor(
        address _registry,
        IUniswapV2Router02 _uniswapV2Router,
        IOptyFiOracle _optyFiOracle
    ) AdapterModifiersBase(_registry) {
        UniswapV2Router = _uniswapV2Router;
        optyFiOracle = _optyFiOracle;
    }

    /**
     * @notice sets the oracle contract for this adapter
     * @dev this function can only be called by operator
     * @param _optyfiOracle address of the optyfi oracle contract
     */
    function setOptyFiOracle(IOptyFiOracle _optyfiOracle) external onlyOperator {
        optyFiOracle = _optyfiOracle;
    }

    /**
     * @notice Sets slippage per want token of pair contract
     * @param _slippages array of Slippage structs that links liquidity pools to slippage per want token
     */
    function setLiquidityPoolToWantTokenToSlippage(Slippage[] calldata _slippages) external onlyRiskOperator {
        uint256 _len = _slippages.length;
        for (uint256 i; i < _len; i++) {
            liquidityPoolToWantTokenToSlippage[_slippages[i].liquidityPool][_slippages[i].wantToken] = _slippages[i]
                .slippage;
        }
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getDepositSomeCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            uint256 _minimumOutputAmount = calculateAmountInLPToken(_inputToken, _liquidityPool, _outputToken, _amount);
            address[] memory _path = new address[](2);
            _path[0] = _inputToken;
            _path[1] = _outputToken;
            _codes[0] = abi.encode(
                address(UniswapV2Router),
                abi.encodeCall(
                    UniswapV2Router.swapExactTokensForTokens,
                    (
                        _amount,
                        (_minimumOutputAmount *
                            (DENOMINATOR - liquidityPoolToWantTokenToSlippage[_liquidityPool][_outputToken])) /
                            DENOMINATOR,
                        _path,
                        _vault,
                        type(uint256).max
                    )
                )
            );
            return _codes;
        }
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getDepositAllCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken
    ) external view override returns (bytes[] memory) {
        return
            getDepositSomeCodes(
                _vault,
                _inputToken,
                _liquidityPool,
                _outputToken,
                ERC20(_inputToken).balanceOf(_vault)
            );
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getWithdrawSomeCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _amount
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            uint256 _minimumOutputAmount = getSomeAmountInToken(_inputToken, _liquidityPool, _outputToken, _amount);
            address[] memory _path = new address[](2);
            _path[0] = _outputToken;
            _path[1] = _inputToken;
            _codes[0] = abi.encode(
                address(UniswapV2Router),
                abi.encodeCall(
                    UniswapV2Router.swapExactTokensForTokens,
                    (
                        _amount,
                        (_minimumOutputAmount *
                            (DENOMINATOR - liquidityPoolToWantTokenToSlippage[_liquidityPool][_inputToken])) /
                            DENOMINATOR,
                        _path,
                        _vault,
                        type(uint256).max
                    )
                )
            );
            return _codes;
        }
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        address _outputToken
    ) external view override returns (bytes[] memory _codes) {
        return
            getWithdrawSomeCodes(
                _vault,
                _underlyingToken,
                _liquidityPool,
                _outputToken,
                ERC20(_outputToken).balanceOf(_vault)
            );
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        address _outputToken
    ) public view override returns (uint256) {
        return
            getSomeAmountInToken(_underlyingToken, _liquidityPool, _outputToken, ERC20(_outputToken).balanceOf(_vault));
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address,
        address,
        address _outputToken
    ) public view override returns (uint256) {
        return ERC20(_outputToken).balanceOf(_vault);
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address,
        address _outputToken,
        uint256 _outputTokenAmount
    ) public view override returns (uint256) {
        uint256 _decimalsA = uint256(ERC20(_underlyingToken).decimals());
        uint256 _decimalsB = uint256(ERC20(_outputToken).decimals());
        return
            (_outputTokenAmount * _getTokenPrice(_outputToken, _underlyingToken) * 10**_decimalsA) /
            (10**(18 + _decimalsB));
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function calculateAmountInLPToken(
        address _inputToken,
        address,
        address _outputToken,
        uint256 _inputTokenAmount
    ) public view override returns (uint256) {
        uint256 _decimalsA = uint256(ERC20(_inputToken).decimals());
        uint256 _decimalsB = uint256(ERC20(_outputToken).decimals());
        return
            (_inputTokenAmount * _getTokenPrice(_inputToken, _outputToken) * 10**_decimalsB) / (10**(18 + _decimalsA));
    }

    /**
     * @dev Return the price of tokenA in tokenB
     * @param _tokenA Contract address of one of the liquidity pool's underlying token
     * @param _tokenB Contract address of one of the liquidity pool's underlying token
     */
    function _getTokenPrice(address _tokenA, address _tokenB) internal view returns (uint256 _price) {
        _price = optyFiOracle.getTokenPrice(_tokenA, _tokenB);
        require(_price > uint256(0), "!price");
    }
}
