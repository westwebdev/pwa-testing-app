/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {HeartIcon, HeartSolidIcon} from '@salesforce/retail-react-app/app/components/icons'

// Components
import {
    AspectRatio,
    Box,
    Skeleton as ChakraSkeleton,
    Text,
    Stack,
    useMultiStyleConfig,
    IconButton
} from '@salesforce/retail-react-app/app/components/shared/ui'
import DynamicImage from '@salesforce/retail-react-app/app/components/dynamic-image'

// Hooks
import {useIntl} from 'react-intl'

// Other
import {productUrlBuilder} from '@salesforce/retail-react-app/app/utils/url'
import Link from '@salesforce/retail-react-app/app/components/link'
import withRegistration from '@salesforce/retail-react-app/app/components/with-registration'
import {useCurrency, useVariationParams} from '@salesforce/retail-react-app/app/hooks'

const IconButtonWithRegistration = withRegistration(IconButton)

// Component Skeleton
export const Skeleton = () => {
    const styles = useMultiStyleConfig('ProductTile')
    return (
        <Box data-testid="sf-product-tile-skeleton">
            <Stack spacing={2}>
                <Box {...styles.imageWrapper}>
                    <AspectRatio ratio={1} {...styles.image}>
                        <ChakraSkeleton />
                    </AspectRatio>
                </Box>
                <ChakraSkeleton width="80px" height="20px" />
                <ChakraSkeleton width={{base: '120px', md: '220px'}} height="12px" />
            </Stack>
        </Box>
    )
}

import { useProduct } from '@salesforce/commerce-sdk-react'
import { useVariationAttributes } from '@salesforce/retail-react-app/app/hooks/use-variation-attributes'
import Swatch from '@salesforce/retail-react-app/app/components/swatch-group/swatch'
import { findImageGroupBy } from '@salesforce/retail-react-app/app/utils/image-groups-utils'

/**
 * The ProductTile is a simple visual representation of a
 * product object. It will show it's default image, name and price.
 * It also supports favourite products, controlled by a heart icon.
 */
const ProductTile = (props) => {
    const intl = useIntl()
    const {
        product,
        enableFavourite = false,
        isFavourite,
        onFavouriteToggle,
        dynamicImageProps,
        ...rest
    } = props

    const {hitType} = product;
    const [productId, setProductId] = useState(product.productId);
    const [image, setImage] = useState(product.image);
    const [price, setPrice] = useState(product.price);
    const [currency, setCurrency] = useState(product.currency);
    const [swatchesParams, setSwatchesParams] = useState({});
    const [isMounted, setIsMounted] = useState(false);

    // ProductTile is used by two components, RecommendedProducts and ProductList.
    // RecommendedProducts provides a localized product name as `name` and non-localized product
    // name as `productName`. ProductList provides a localized name as `productName` and does not
    // use the `name` property.
    const localizedProductName = product.name ?? product.productName

    const {currency: activeCurrency} = useCurrency()
    const [isFavouriteLoading, setFavouriteLoading] = useState(false)
    const styles = useMultiStyleConfig('ProductTile')

    const { data: fullProduct } = useProduct(
        {
            parameters: {
                id: productId,
                allImages: true
            }
        },
        {
            keepPreviousData: true
        }
    );

    const productAttributes = useVariationAttributes(fullProduct)
    const isAttributeSelected = (currentValue, selectedValue) => {
        return selectedValue?.value === currentValue;
    }

    const changeTileImage = (swatchesParams) => {
        const groupedImages = findImageGroupBy(fullProduct.imageGroups, {
            viewType: 'large',
            selectedVariationAttributes: swatchesParams
        });

        setImage(groupedImages?.images[0])
    }

    useEffect(() => {
        if (isMounted) {
            const isOnlyColor = Object.keys(swatchesParams).every(key => key.toLowerCase() === 'color');
            const variationObj = isOnlyColor && fullProduct.variationGroups ? fullProduct.variationGroups : fullProduct.variants;
            const targetPID = variationObj.find(item => {
                const { variationValues } = item;

                return Object.entries(swatchesParams).every(([key, value]) => {
                    return variationValues[key] === value;
                })
            })?.productId;

            setProductId(targetPID)
        }
    }, [swatchesParams])

    useEffect(() => {
        if (isMounted) {
            changeTileImage(swatchesParams);
            setPrice(fullProduct.price);
            setCurrency(fullProduct.currency);
        }
    }, [productId])

    const handleAttributeChange = (swatchesValue, swatchesName) => {
        setSwatchesParams({...swatchesParams, [swatchesName]: swatchesValue});
    }

    useEffect(() => {
        setIsMounted(true)
    });

    return (
        <Link
            data-testid="product-tile"
            {...styles.container}
            to={productUrlBuilder({id: productId}, intl.local)}
            {...rest}
        >
            <Box {...styles.imageWrapper}>
                {image && (
                    <AspectRatio {...styles.image}>
                        <DynamicImage
                            src={`${image.disBaseLink || image.link}[?sw={width}&q=60]`}
                            widths={dynamicImageProps?.widths}
                            imageProps={{
                                alt: image.alt,
                                ...dynamicImageProps?.imageProps
                            }}
                        />
                    </AspectRatio>
                )}

                {enableFavourite && (
                    <Box
                        onClick={(e) => {
                            // stop click event from bubbling
                            // to avoid user from clicking the underlying
                            // product while the favourite icon is disabled
                            e.preventDefault()
                        }}
                    >
                        <IconButtonWithRegistration
                            aria-label={intl.formatMessage({
                                id: 'product_tile.assistive_msg.wishlist',
                                defaultMessage: 'Wishlist'
                            })}
                            icon={isFavourite ? <HeartSolidIcon /> : <HeartIcon />}
                            {...styles.favIcon}
                            disabled={isFavouriteLoading}
                            onClick={async () => {
                                setFavouriteLoading(true)
                                await onFavouriteToggle(!isFavourite)
                                setFavouriteLoading(false)
                            }}
                        />
                    </Box>
                )}
            </Box>
            {/* Attributes */}
            {
                <Box>
                    {
                        productAttributes.length && productAttributes.map((attr) => {
                            const {id, name, selectedValue, values = []} = attr
                            const attrName = name.toLowerCase();
                            return (
                                <Box key={id}>
                                    {values.map(
                                        ({href, name, image, value, orderable}) => {
                                        return (
                                            <Swatch
                                                key={value}
                                                href={href}
                                                disabled={!orderable}
                                                value={value}
                                                name={name}
                                                variant={attrName === 'color' ? 'circle' : 'square'}
                                                selected={isAttributeSelected(value, selectedValue)}
                                                onChange={() => handleAttributeChange(value, attrName)}
                                            >
                                                {image ? (
                                                    <Box
                                                        height="100%"
                                                        width="100%"
                                                        minWidth="32px"
                                                        backgroundRepeat="no-repeat"
                                                        backgroundSize="cover"
                                                        backgroundColor={name.toLowerCase()}
                                                        backgroundImage={image ? `url(${image.disBaseLink || image.link})` : ''}
                                                    />
                                                ) : (
                                                    name
                                                )}
                                            </Swatch>
                                            )
                                        }
                                    )}
                                </Box>
                            );
                        })
                    }
                </Box>
            }

            {/* Title */}
            <Text {...styles.title}>{localizedProductName}</Text>

            {/* Price */}
            <Text {...styles.price} data-testid="product-tile-price">
                {hitType === 'set' &&
                    intl.formatMessage({
                        id: 'product_tile.label.starting_at_price',
                        defaultMessage: 'Starting at'
                    })}{' '}
                {intl.formatNumber(price, {
                    style: 'currency',
                    currency: currency || activeCurrency
                })}
            </Text>
        </Link>
    )
}

ProductTile.displayName = 'ProductTile'

ProductTile.propTypes = {
    /**
     * The product search hit that will be represented in this
     * component.
     */
    product: PropTypes.shape({
        currency: PropTypes.string,
        image: PropTypes.shape({
            alt: PropTypes.string,
            disBaseLink: PropTypes.string,
            link: PropTypes.string
        }),
        price: PropTypes.number,
        // `name` is present and localized when `product` is provided by a RecommendedProducts component
        // (from Shopper Products `getProducts` endpoint), but is not present when `product` is
        // provided by a ProductList component.
        // See: https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-products?meta=getProducts
        name: PropTypes.string,
        // `productName` is localized when provided by a ProductList component (from Shopper Search
        // `productSearch` endpoint), but is NOT localized when provided by a RecommendedProducts
        // component (from Einstein Recommendations `getRecommendations` endpoint).
        // See: https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-search?meta=productSearch
        // See: https://developer.salesforce.com/docs/commerce/einstein-api/references/einstein-api-quick-start-guide?meta=getRecommendations
        // Note: useEinstein() transforms snake_case property names from the API response to camelCase
        productName: PropTypes.string,
        productId: PropTypes.string,
        hitType: PropTypes.string
    }),
    /**
     * Enable adding/removing product as a favourite.
     * Use case: wishlist.
     */
    enableFavourite: PropTypes.bool,
    /**
     * Display the product as a faviourite.
     */
    isFavourite: PropTypes.bool,
    /**
     * Callback function to be invoked when the user
     * interacts with favourite icon/button.
     */
    onFavouriteToggle: PropTypes.func,
    dynamicImageProps: PropTypes.object
}

export default ProductTile
