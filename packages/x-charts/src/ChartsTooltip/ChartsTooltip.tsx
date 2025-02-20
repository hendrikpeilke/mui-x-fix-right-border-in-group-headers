'use client';
import * as React from 'react';
import PropTypes from 'prop-types';
import composeClasses from '@mui/utils/composeClasses';
import useLazyRef from '@mui/utils/useLazyRef';
import { styled, useThemeProps, SxProps, Theme } from '@mui/material/styles';
import Popper, { PopperProps as BasePopperProps } from '@mui/material/Popper';
import NoSsr from '@mui/material/NoSsr';
import useSlotProps from '@mui/utils/useSlotProps';
import {
  AxisInteractionData,
  InteractionContext,
  ItemInteractionData,
} from '../context/InteractionProvider';
import { useSvgRef } from '../hooks/useSvgRef';
import { getTooltipHasData, TriggerOptions, usePointerType } from './utils';
import { ChartSeriesType } from '../models/seriesType/config';
import { ChartsItemContentProps, ChartsItemTooltipContent } from './ChartsItemTooltipContent';
import { ChartsAxisContentProps, ChartsAxisTooltipContent } from './ChartsAxisTooltipContent';
import { ChartsTooltipClasses, getChartsTooltipUtilityClass } from './chartsTooltipClasses';

export type PopperProps = BasePopperProps & {
  /**
   * The system prop that allows defining system overrides as well as additional CSS styles.
   */
  sx?: SxProps<Theme>;
};

export interface ChartsTooltipSlots<T extends ChartSeriesType> {
  /**
   * Custom component for the tooltip popper.
   * @default ChartsTooltipRoot
   */
  popper?: React.ElementType<PopperProps>;
  /**
   * Custom component for displaying tooltip content when triggered by axis event.
   * @default DefaultChartsAxisTooltipContent
   */
  axisContent?: React.ElementType<ChartsAxisContentProps>;
  /**
   * Custom component for displaying tooltip content when triggered by item event.
   * @default DefaultChartsItemTooltipContent
   */
  itemContent?: React.ElementType<ChartsItemContentProps<T>>;
}

export interface ChartsTooltipSlotProps<T extends ChartSeriesType> {
  popper?: Partial<PopperProps>;
  axisContent?: Partial<ChartsAxisContentProps>;
  itemContent?: Partial<ChartsItemContentProps<T>>;
}

export interface ChartsTooltipProps<T extends ChartSeriesType> {
  /**
   * Select the kind of tooltip to display
   * - 'item': Shows data about the item below the mouse.
   * - 'axis': Shows values associated with the hovered x value
   * - 'none': Does not display tooltip
   * @default 'axis'
   */
  trigger?: TriggerOptions;
  /**
   * Component to override the tooltip content when trigger is set to 'item'.
   * @deprecated Use slots.itemContent instead
   */
  itemContent?: React.ElementType<ChartsItemContentProps<any>>;
  /**
   * Component to override the tooltip content when trigger is set to 'axis'.
   * @deprecated Use slots.axisContent instead
   */
  axisContent?: React.ElementType<ChartsAxisContentProps>;
  /**
   * Override or extend the styles applied to the component.
   */
  classes?: Partial<ChartsTooltipClasses>;
  /**
   * Overridable component slots.
   * @default {}
   */
  slots?: ChartsTooltipSlots<T>;
  /**
   * The props used for each component slot.
   * @default {}
   */
  slotProps?: ChartsTooltipSlotProps<T>;
}

const useUtilityClasses = <T extends ChartSeriesType>(ownerState: {
  classes: ChartsTooltipProps<T>['classes'];
}) => {
  const { classes } = ownerState;

  const slots = {
    root: ['root'],
    paper: ['paper'],
    table: ['table'],
    row: ['row'],
    cell: ['cell'],
    mark: ['mark'],
    markCell: ['markCell'],
    labelCell: ['labelCell'],
    valueCell: ['valueCell'],
  };

  return composeClasses(slots, getChartsTooltipUtilityClass, classes);
};

const ChartsTooltipRoot = styled(Popper, {
  name: 'MuiChartsTooltip',
  slot: 'Root',
  overridesResolver: (_, styles) => styles.root,
})(({ theme }) => ({
  pointerEvents: 'none',
  zIndex: theme.zIndex.modal,
}));

/**
 * Demos:
 *
 * - [ChartsTooltip](https://mui.com/x/react-charts/tooltip/)
 *
 * API:
 *
 * - [ChartsTooltip API](https://mui.com/x/api/charts/charts-tool-tip/)
 */
function ChartsTooltip<T extends ChartSeriesType>(inProps: ChartsTooltipProps<T>) {
  const props = useThemeProps({
    props: inProps,
    name: 'MuiChartsTooltip',
  });
  const { trigger = 'axis', itemContent, axisContent, slots, slotProps } = props;

  const svgRef = useSvgRef();
  const pointerType = usePointerType();

  const popperRef: PopperProps['popperRef'] = React.useRef(null);

  const positionRef = useLazyRef(() => ({ x: 0, y: 0 }));

  const { item, axis } = React.useContext(InteractionContext);

  const displayedData = trigger === 'item' ? item : axis;

  const tooltipHasData = getTooltipHasData(trigger, displayedData);
  const popperOpen = pointerType !== null && tooltipHasData;

  const classes = useUtilityClasses({ classes: props.classes });

  const PopperComponent = slots?.popper ?? ChartsTooltipRoot;
  const popperProps = useSlotProps({
    elementType: PopperComponent,
    externalSlotProps: slotProps?.popper,
    additionalProps: {
      open: popperOpen,
      placement: pointerType?.pointerType === 'mouse' ? ('right-start' as const) : ('top' as const),
      popperRef,
      anchorEl: {
        getBoundingClientRect: () => ({
          x: positionRef.current.x,
          y: positionRef.current.y,
          top: positionRef.current.y,
          left: positionRef.current.x,
          right: positionRef.current.x,
          bottom: positionRef.current.y,
          width: 0,
          height: 0,
          toJSON: () => '',
        }),
      },
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, pointerType?.pointerType === 'touch' ? 40 - pointerType.height : 0],
          },
        },
      ],
    },
    ownerState: {},
  });

  React.useEffect(() => {
    const element = svgRef.current;
    if (element === null) {
      return () => {};
    }

    const handleMove = (event: PointerEvent) => {
      // eslint-disable-next-line react-compiler/react-compiler
      positionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      popperRef.current?.update();
    };
    element.addEventListener('pointermove', handleMove);

    return () => {
      element.removeEventListener('pointermove', handleMove);
    };
  }, [svgRef, positionRef]);

  if (trigger === 'none') {
    return null;
  }

  return (
    <NoSsr>
      {popperOpen && (
        <PopperComponent {...popperProps} className={classes.root}>
          {trigger === 'item' ? (
            <ChartsItemTooltipContent
              itemData={displayedData as ItemInteractionData<T>}
              content={(slots?.itemContent ?? itemContent) as any}
              contentProps={slotProps?.itemContent as Partial<ChartsItemContentProps<T>>}
              sx={{ mx: 2 }}
              classes={classes}
            />
          ) : (
            <ChartsAxisTooltipContent
              axisData={displayedData as AxisInteractionData}
              content={slots?.axisContent ?? axisContent}
              contentProps={slotProps?.axisContent}
              sx={{ mx: 2 }}
              classes={classes}
            />
          )}
        </PopperComponent>
      )}
    </NoSsr>
  );
}

ChartsTooltip.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "pnpm proptypes"  |
  // ----------------------------------------------------------------------
  /**
   * Component to override the tooltip content when trigger is set to 'axis'.
   * @deprecated Use slots.axisContent instead
   */
  axisContent: PropTypes.elementType,
  /**
   * Override or extend the styles applied to the component.
   */
  classes: PropTypes.object,
  /**
   * Component to override the tooltip content when trigger is set to 'item'.
   * @deprecated Use slots.itemContent instead
   */
  itemContent: PropTypes.elementType,
  /**
   * The props used for each component slot.
   * @default {}
   */
  slotProps: PropTypes.object,
  /**
   * Overridable component slots.
   * @default {}
   */
  slots: PropTypes.object,
  /**
   * Select the kind of tooltip to display
   * - 'item': Shows data about the item below the mouse.
   * - 'axis': Shows values associated with the hovered x value
   * - 'none': Does not display tooltip
   * @default 'axis'
   */
  trigger: PropTypes.oneOf(['axis', 'item', 'none']),
} as any;

export { ChartsTooltip };
