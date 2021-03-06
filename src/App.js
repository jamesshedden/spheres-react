import React, { Component } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import Stars from './Stars';
import './App.css';
import { CloseIcon, CloseIconMobile, MenuIcon, RandomiseIcon, TickIcon } from './icons';

const MAX_CIRCLE_AMOUNT = 10;
const ONBOARDING_CIRCLE_AMOUNT = 6;
let PARALLAX_AMOUNT_DIVISOR = 80;

const AVAILABLE_COLORS = {
  RED: '#FF5130',
  DARK_PURPLE: '#370078',
  DARKER_BLUE: '#0037D0',
  DARK_GREY: '#3A3A3A',
  ORANGE: '#FEB422',
  PURPLE: '#A496FF',
  DARK_BLUE: '#4692FF',
  GREY: '#B4B4B4',
  YELLOW: '#FFDD30',
  PINK: '#F7A2E0',
  LIGHT_BLUE: '#A2FFFB',
  GREEN: '#5CFF80',
};

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge'];

const ANGLES = {
  0: '0deg',
  45: '45deg',
  135: '135deg',
  180: '180deg',
  225: '225deg',
  315: '315deg',
};

const localStorage = window.localStorage || {
  getItem: () => null,
  setItem: () => null,
};

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: localStorage.getItem('spheres.backgroundColor1') || AVAILABLE_COLORS.LIGHT_BLUE,
      backgroundColor2: localStorage.getItem('spheres.backgroundColor2') || AVAILABLE_COLORS.DARK_PURPLE,
      backgroundAngle: localStorage.getItem('spheres.backgroundAngle') || ANGLES[45],
      circleColor1: localStorage.getItem('spheres.circleColor1') || AVAILABLE_COLORS.RED,
      circleColor2: localStorage.getItem('spheres.circleColor2') || AVAILABLE_COLORS.PURPLE,
      circleColor3: localStorage.getItem('spheres.circleColor3') || AVAILABLE_COLORS.GREEN,
      circleAngle: localStorage.getItem('spheres.circleAngle') || ANGLES[180],
      activeCircle: null,
      stars: [],
      circleElements: [],
      sphereCount: 0,
      isMenuOpen: localStorage.getItem('spheres.isMenuOpen') === 'true' ? true : false,
      isRandomiseShortcutVisible: localStorage.getItem('spheres.isRandomiseShortcutVisible') === 'true' ? true : false,
      isUserAfterFirstSphereMove: localStorage.getItem('spheres.isUserAfterFirstSphereMove') === 'true' ? true : false,
      isUserFullyOnboarded: localStorage.getItem('spheres.isUserFullyOnboarded') === 'true' ? true : false,
      isUserOnboardedOnNextMount: localStorage.getItem('spheres.isUserOnboardedOnNextMount') === 'true' ? true : false,
    };
  }

  componentWillMount() {
    if (this.state.isUserOnboardedOnNextMount) {
      this.setState({
        isUserFullyOnboarded: true,
        isUserOnboardedOnNextMount: false,
      }, () => {
        localStorage.setItem('spheres.isUserFullyOnboarded', true);
        localStorage.setItem('spheres.isUserOnboardedOnNextMount', false);
      });
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.throttledWindowResize);

    // window.addEventListener('deviceorientation', this.throttledDeviceOrientation);

    window.addEventListener('touchstart', () => {
      // the higher this is, the less we see any parallax effects — this
      // effectively turns parallax off if the user is interacting via
      // touch events
      PARALLAX_AMOUNT_DIVISOR = 5000;

      // setting this on state causes issues with the menu scrolling???
      // saving in memory for now
      window.IS_TOUCH_USER = true;
    }, { passive: false });

    // This is necessary to both touchstart & mousedown being triggered on
    // mobile chrome. By setting passive to false explicitly, we can prevent it
    // ourselves rather than relying on Chrome's attempt to make it 'passive'
    // (which does not result in the event being completely prevented)
    document.getElementById('content').addEventListener('touchstart', (event) => {
      if (!_.includes(event.target.classList, 'no-circle')) {
        event.preventDefault();
        this.onMouseDown(event);
      }
    }, { passive: false })

    document.getElementById('content').addEventListener('touchmove', (event) => {
      if (!_.includes(event.target.classList, 'no-circle')) {
        event.preventDefault();
        this.throttledMouseMove(event);
      }
    }, { passive: false })

    // - Only allow touchmove on menu
    //
    // - Elsewhere we add it back specifically for the main content element with
    // a `onTouchMove` prop, but we don't want it on the document to prevent
    // mobile browser from pulling the entire window up and down when we only
    // want to drag a sphere
    window.addEventListener('touchmove', (event) => {
      if (!event.target.classList.contains('no-circle')) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  throttledDeviceOrientation = (event) => {
    _.throttle(_.partial(this.onDeviceOrientation, event), 10)();
  }

  onDeviceOrientation = (event) => {
    if (this.state.circleElements.length && window.IS_TOUCH_USER) {
      let { beta, gamma } = event;

      // Because we don't want to have the device upside down
      // We constrain the x value to the range [-90,90]
      if (beta >  90) { beta =  90};
      if (beta < -90) { beta = -90};

      this.transformCirclesWithOrientation(this.state.circleElements, beta, gamma);
    }
  }

  componentDidUpdate() {
    if (this.state.isMenuOpen && this.state.menuContentsScrollPosition) {
      document.getElementById('menu-content').scrollTop = this.state.menuContentsScrollPosition;
    }
  }

  throttledWindowResize = () => {
    _.throttle(this.onWindowResize, 10)();
  }

  onWindowResize = () => {
    const circles = _.map(this.state.circles, (circle) => {
      return _.assign({}, circle, {
        top: (window.innerHeight / 100) * circle.distanceAsPercent.top,
        left: (window.innerWidth / 100) * circle.distanceAsPercent.left,
      });
    })

    this.setState({ circles });
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  getPointerCoordinatesFromCentre = (positionX, positionY) => {
    return {
      x: (window.innerWidth / 2) - positionX,
      y: (window.innerHeight / 2) - positionY,
    };
  }

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, parallaxDivisor, deviceOrientationValues) => {
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these
    const MULTIPLIER_BUFFER = 2;

    const multiplier = multiplierFromZero + MULTIPLIER_BUFFER

    let translateX;
    let translateY;

    if (coordinates && !deviceOrientationValues) {
      translateX = (coordinates.x * (multiplier)) / parallaxDivisor;
      translateY = (coordinates.y * (multiplier)) / parallaxDivisor;
    } else if (!coordinates && deviceOrientationValues) {
      translateX = (deviceOrientationValues.beta * (multiplier)) / parallaxDivisor;
      translateY = (deviceOrientationValues.gamma * (multiplier)) / parallaxDivisor;
    }

    return {
      translateX,
      translateY,
    };
  }

  repositionCircles = (circles, pageX, pageY) => {
    let totals = _.map(circles, (circle, index) => {
      let el = document.getElementById(`circle-${ circle.id }`);
      let { top, left } = circle;
      let { transform } = el.style;
      let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

      return {
        id: circle.id,
        totals: {
          vertical: top + translateY,
          horizontal: left + translateX,
        }
      }
    });

    circles = _.merge([], circles, totals);

    let repositionedCircles = _.map(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(pageX, pageY),
        index - 1,
        PARALLAX_AMOUNT_DIVISOR,
      );

      let top = circle.totals.vertical - translateY;
      let left = circle.totals.horizontal - translateX;

      return {
        id: circle.id,
        top,
        left,
        totals: {
          vertical: top + translateY, // just for debugging
          horizontal: left + translateX,
        },
        translateX,
        translateY,
      }
    });

    circles = _.merge([], circles, repositionedCircles);
    return circles;
  }

  removeCircleSurplus = (circles) => {
    if (circles.length > MAX_CIRCLE_AMOUNT) {
      let circleToBeRemoved = document.getElementById(`circle-${ circles[0].id }`);

      let cloned = circleToBeRemoved.cloneNode(true);
      cloned.classList.remove('circle');
      cloned.classList.add('removed-circle');
      cloned.id = '';
      document.body.appendChild(cloned);

      setTimeout(() => {
        document.body.removeChild(cloned);
      }, 1000)

      return circles.slice(1, circles.length);
    } else {
      return circles;
    }
  }

  makeCircle = (event) => {
    let eventType = event.type;

    if (eventType === 'touchend') {
      event = event.nativeEvent.changedTouches[0];
    } else {
      event.persist();
    }

    let { pageX, pageY } = event;

    // const randomDimension = this.randomNumber(100, 250);

    const multiplierForTranslateAmounts = this.state.sphereCount > MAX_CIRCLE_AMOUNT ?
      MAX_CIRCLE_AMOUNT - 1 : this.state.sphereCount;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR,
    );

    // let color = COLORS[this.randomNumber(0, COLORS.length)];
    let colorIndex = this.randomNumber(1, 3);
    let size = SIZES[this.randomNumber(0, SIZES.length)];

    let circles = this.state.circles;

    let top = pageY - translateY;
    let left = pageX - translateX;

    if (this.state.sphereCount >= MAX_CIRCLE_AMOUNT) {
      circles = this.repositionCircles(circles, pageX, pageY);
    }

    circles.push({
      id: this.state.sphereCount,
      colorIndex,
      size,
      // width: randomDimension,
      // height: randomDimension,
      distanceAsPercent: {
        top: (top * 100) / window.innerHeight,
        left: (left * 100) / window.innerWidth,
      },
      top,
      left,
      translateX,
      translateY,
    });

    circles = this.removeCircleSurplus(circles);

    const arrayOfIndexes = _.map([...Array(circles.length)], (_, index) => {
      return { index };
    });

    circles = _.merge([], circles, arrayOfIndexes);

    this.setState({
      circles,
      sphereCount: this.state.sphereCount + 1,
    }, () => {
      this.setState({
        circleElements: document.getElementsByClassName('circle'),
      });

      if (!this.state.isUserFullyOnboarded && this.state.circles.length === ONBOARDING_CIRCLE_AMOUNT) {
        this.setState({
          isUserOnboardedOnNextMount: true,
        }, () => {
          localStorage.setItem('spheres.isUserOnboardedOnNextMount', true);
        });
      }
    });
  };

  returnTransformValuesAsNumbers = (values) => {
    let numbers = values.match(/\(.*?\)/g);

    return {
      translateX: parseFloat(numbers[0].replace(/[^0-9|.|-]/g, '')),
      translateY: parseFloat(numbers[1].replace(/[^0-9|.|-]/g, '')),
    }
  }

  transformCircles = (circles, event) => {
    let { pageX, pageY } = event;

    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(pageX, pageY),
        index,
        PARALLAX_AMOUNT_DIVISOR,
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  transformCirclesWithOrientation = (circles, beta, gamma) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        null,
        index,
        PARALLAX_AMOUNT_DIVISOR,
        { beta, gamma }
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  sphereDrag = (pageX, pageY) => {
    let activeCircleIndex = _.find(this.state.circles, { id: this.state.activeCircle.id }).index;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      activeCircleIndex,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let { top, left } = this.getPosition(
      pageX,
      pageY,
      translateX,
      translateY
    );

    return {
      top,
      left,
      translateX,
      translateY
    }
  }

  transformActiveCircle = (event) => {
    if (!this.state.isUserAfterFirstSphereMove) {
      this.setState({
        isUserAfterFirstSphereMove: true,
      }, () => {
        localStorage.setItem('spheres.isUserAfterFirstSphereMove', true);
      });
    }

    if (event.type === 'touchend') {
      event = event.nativeEvent.changedTouches[0];
    } else {
      event.persist();
    }

    let { pageX, pageY } = event;

    let activeCircleIndex = _.findIndex(this.state.circles, { id: this.state.activeCircle.id });

    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY);

    let distanceAsPercent = {
      top: (top * 100) / window.innerHeight,
      left: (left * 100) / window.innerWidth,
    };

    let newCircles = this.state.circles;

    newCircles[activeCircleIndex] = _.assign({}, newCircles[activeCircleIndex], {
      distanceAsPercent,
      top,
      left,
      translateX,
      translateY,
    });

    this.setState({ circles: newCircles });
  }

  getPosition = (pageX, pageY, translateX, translateY) => {
    const { pointerDistanceFromCircleCentre } = this.state.activeCircle;

    const top = pageY - translateY - pointerDistanceFromCircleCentre.y;
    const left = pageX - translateX - pointerDistanceFromCircleCentre.x;

    return {
      top,
      left,
    };
  }

  moveActiveCircle = (element, pageX, pageY, eventType) => {
    let {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, element.offsetWidth);

    element.style.top = `${ top }px`;
    element.style.left = `${ left }px`;
    element.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
  }

  onMouseMove = (event) => {
    const eventType = event.type;

    if (eventType === 'touchmove') {
      event = event.changedTouches[0];
    } else {
      event.persist();
    }

    const { pageX, pageY } = event;

    if (this.state.circleElements.length && !window.IS_TOUCH_USER) {
      this.transformCircles(this.state.circleElements, event);
    }

    if (this.state.activeCircle) {
      this.moveActiveCircle(this.state.activeCircle.element, pageX, pageY);
    }
  }

  onMouseDown = (event) => {
    if (!_.includes(event.target.classList, 'circle') && !_.includes(event.target.classList, 'no-circle')) {
      this.setState({
        activeCircle: null,
        menuContentsScrollPosition: document.getElementById('menu-content') && document.getElementById('menu-content').scrollTop,
      });
    }

    if (_.includes(event.target.classList, 'circle')) {
      this.setState({
        menuContentsScrollPosition: document.getElementById('menu-content') && document.getElementById('menu-content').scrollTop,
      });
    }
  }

  throttledMouseMove = (event) => {
    _.throttle(this.onMouseMove.bind(this, event), 20)();
  }

  onMouseUp = (event) => {
    if (!_.includes(event.target.classList, 'no-circle')) {
      if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
        this.transformActiveCircle(event);
        this.state.activeCircle.element.classList.remove('is-active');
        this.setState({ activeCircle: null });
      } else {
        // if there are no spheres, we should be able to create our first one.
        //
        // if there is only one sphere, and the user hasn't moved their first sphere,
        // then we should prevent new spheres being created.
        //
        // if there is equal to or more than 1 sphere & the user has moved their first sphere,
        // then we're good to go.
        if (this.state.circles.length === 0 || (this.state.circles.length >= 1 && this.state.isUserAfterFirstSphereMove)) {
          this.makeCircle(event);
          this.setState({ activeCircle: null });
        }
      };
    }
  }

  onCircleMouseDown = (event, circle) => {
    if (event.type === 'touchend' || event.type === 'touchstart') {
      // keep the timestamp & reattach it to our mutated `event` later
      let timeStamp = event.timeStamp;
      event = event.nativeEvent.changedTouches[0];
      // reattach timestamp
      event.timeStamp = timeStamp;
    }

    const { pageX, pageY } = event;

    const {
      id,
      left,
      top,
    } = circle;

    let { transform } = event.target.style;
    let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

    let pointerDistanceFromCircleCentre = {
      x: pageX - translateX - left,
      y: pageY - translateY - top,
    }

    if (!event.target.classList.contains('is-active')) {
      event.target.classList.add('is-active');
    }

    this.setState({
      activeCircle: {
        id,
        element: event.target,
        activeAt: event.timeStamp,
        pointerDistanceFromCircleCentre,
      },
    });
  }

  getRandomValueFromValues = (values) => {
    return values[Object.keys(values)[this.randomNumber(0, Object.keys(values).length)]];
  };

  randomiseSettings = () => {
    this.setState({
      backgroundColor1: this.getRandomValueFromValues(AVAILABLE_COLORS),
      backgroundColor2: this.getRandomValueFromValues(AVAILABLE_COLORS),
      backgroundAngle: this.getRandomValueFromValues(ANGLES),
      circleColor1: this.getRandomValueFromValues(AVAILABLE_COLORS),
      circleColor2: this.getRandomValueFromValues(AVAILABLE_COLORS),
      circleColor3: this.getRandomValueFromValues(AVAILABLE_COLORS),
      circleAngle: this.getRandomValueFromValues(ANGLES),
      menuContentsScrollPosition: document.getElementById('menu-content') && document.getElementById('menu-content').scrollTop,
    }, () => {
      window.localStorage.setItem('spheres.backgroundColor1', this.state.backgroundColor1);
      window.localStorage.setItem('spheres.backgroundColor2', this.state.backgroundColor2);
      window.localStorage.setItem('spheres.backgroundAngle', this.state.backgroundAngle);
      window.localStorage.setItem('spheres.circleColor1', this.state.circleColor1);
      window.localStorage.setItem('spheres.circleColor2', this.state.circleColor2);
      window.localStorage.setItem('spheres.circleColor3', this.state.circleColor3);
      window.localStorage.setItem('spheres.circleAngle', this.state.circleAngle);
    });
  }

  openMenu = () => {
    this.setState({ isMenuOpen: true });
    window.localStorage.setItem('spheres.isMenuOpen', true);

    if (!this.state.isUserFullyOnboarded) {
      this.setState({
        isUserFullyOnboarded: true,
      }, () => {
        window.localStorage.setItem('spheres.isUserFullyOnboarded', false);
      });
    }
  }

  closeMenu = () => {
    this.setState({ isMenuOpen: false });
    window.localStorage.setItem('spheres.isMenuOpen', false);
  }

  toggleRandomiseShortcut = () => {
    if (this.state.isRandomiseShortcutVisible) {
      this.setState({
        isRandomiseShortcutVisible: false
      });

      window.localStorage.setItem('spheres.isRandomiseShortcutVisible', false);
    } else {
      this.setState({
        isRandomiseShortcutVisible: true
      });

      window.localStorage.setItem('spheres.isRandomiseShortcutVisible', true);
    }
  }

  render() {
    const circleClassNames = (size) => {
      return classNames('circle', {
        'size-small': size === 'small',
        'size-xsmall': size === 'xsmall',
        'size-medium': size === 'medium',
        'size-large': size === 'large',
        'size-xlarge': size === 'xlarge',
        'size-xxlarge': size === 'xxlarge',
        'size-xxxlarge': size === 'xxxlarge',
      });
    }

    const ImagePreloader = () => {
      return (
        <div style={ {
          width: '0px',
          height: '0px',
          overflow: 'hidden',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
        } }>
          <img alt="" src="/dots-texture-light.jpg"/>
          <img alt="" src="/dots-texture-dark-transparent.png"/>
        </div>
      );
    }

    const ColorSelect = ({ keyToChange }) => {
      return (
        <div className='color-select no-circle'>
          {
            _.map(AVAILABLE_COLORS, (color, index) => {
              return (
                <div key={ index }
                className={ classNames('color-select__item no-circle', {
                  'is-active': this.state[keyToChange] === color
                }) }
                style={ {
                  backgroundColor: color,
                } }
                onClick={ () => {
                  this.setState({
                    [keyToChange]: color,
                    menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                  }, () => {
                    window.localStorage.setItem(`spheres.${keyToChange}`, color);
                  });
                } }>
                  <div className="color-select__active-icon no-circle">
                    <TickIcon/>
                  </div>
                </div>
              );
            })
          }
        </div>
      );
    }

    const AngleSelect = ({ keyToChange }) => {
      return (
        <div className="angle-select no-circle">
          {
            _.map(ANGLES, (angle, index) => {
              return (
                <div key={ index }
                className={ classNames('angle-select__item no-circle', {
                  'is-active': this.state[keyToChange] === angle
                }) }
                style={ {
                  background: `
                    linear-gradient(
                      ${ angle },
                      ${ keyToChange === 'backgroundAngle'? this.state.backgroundColor1 : this.state.circleColor1 } 0%,
                      ${ this.state.backgroundColor2 } 100%
                    )
                  `,
                } }
                onClick={ () => {
                  this.setState({
                    [keyToChange]: angle,
                    menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                  }, () => {
                    window.localStorage.setItem(`spheres.${keyToChange}`, angle);
                  });
                } }>
                  <div className="angle-select__active-icon no-circle">
                    <TickIcon/>
                  </div>
                </div>
              );
            })
          }
        </div>
      );
    }

    const Menu = () => {
      return (
        <div className="menu no-circle">

          <div className="menu__mobile-spacer no-circle"
          onClick={ this.closeMenu } />

          <div className="menu__content no-circle" id="menu-content">
            {
              this.state.isMenuOpen ?
              <div id="close-menu-icon"
              className="close-menu-icon no-circle"
              onClick={ this.closeMenu }>
                <div className="close-menu-icon__desktop-image no-circle">
                  <CloseIcon/>
                </div>

                <div className="close-menu-icon__mobile-image no-circle">
                  <CloseIconMobile/>
                </div>
              </div>
              : null
            }

            <div className="menu__title no-circle">
              <div className="menu__title-sphere no-circle"></div>
              Spheres
            </div>

            <div className="menu__section no-circle">
              <div className="menu__section-item no-circle">
                <div onClick={ this.randomiseSettings }
                id="randomise-menu-item"
                className="menu__section-item-title no-circle">
                  Randomise!
                </div>
              </div>

              <div className="menu__section-item no-circle"
              onClick={ () => {
                this.toggleRandomiseShortcut();
                this.setState({
                  menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                });
              } }>
                <div className="menu__section-item-title no-circle">
                  {
                    this.state.isRandomiseShortcutVisible
                      ? 'Hide randomise shortcut'
                      : 'Show randomise shortcut'
                  }
                </div>
              </div>
            </div>

            <div className="menu__section no-circle">
              <div className="menu__section-title no-circle">
                Background
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isBackgroundColor1Toggled: !prevState.isBackgroundColor1Toggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Colour 1

                  {
                    this.state.isBackgroundColor1Toggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview"
                    style={ {
                      backgroundColor: this.state.backgroundColor1
                    } }/>
                  }
                </div>

                {
                  this.state.isBackgroundColor1Toggled ?
                  <ColorSelect keyToChange='backgroundColor1'/>
                  : null
                }
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isBackgroundColor2Toggled: !prevState.isBackgroundColor2Toggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Colour 2

                  {
                    this.state.isBackgroundColor2Toggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview"
                    style={ {
                      backgroundColor: this.state.backgroundColor2
                    } }/>
                  }
                </div>

                {
                  this.state.isBackgroundColor2Toggled ?
                  <ColorSelect keyToChange='backgroundColor2'/>
                  : null
                }
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isBackgroundAngleToggled: !prevState.isBackgroundAngleToggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Direction

                  {
                    this.state.isBackgroundAngleToggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview"
                    style={ {
                      background: `
                        linear-gradient(
                          ${ this.state.backgroundAngle },
                          ${ this.state.backgroundColor1 } ${
                            this.state.backgroundAngle === '0deg' || this.state.backgroundAngle === '180deg' ?
                              '0%' : '10%'
                          },
                          ${ this.state.backgroundColor2 } ${
                            this.state.backgroundAngle === '0deg' || this.state.backgroundAngle === '180deg' ?
                              '100%' : '90%'
                          }
                        )
                      `
                    } }/>
                  }
                </div>

                {
                  this.state.isBackgroundAngleToggled ?
                  <AngleSelect keyToChange='backgroundAngle'/>
                  : null
                }
              </div>
            </div>

            <div className="menu__section no-circle">
              <div className="menu__section-title no-circle">
                Spheres
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isCircleColor1Toggled: !prevState.isCircleColor1Toggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Colour 1

                  {
                    this.state.isCircleColor1Toggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview menu__section-item-preview--sphere"
                    style={ {
                      backgroundColor: this.state.circleColor1
                    } }/>
                  }
                </div>

                {
                  this.state.isCircleColor1Toggled ?
                  <ColorSelect keyToChange='circleColor1'/>
                  : null
                }
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isCircleColor2Toggled: !prevState.isCircleColor2Toggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Colour 2

                  {
                    this.state.isCircleColor2Toggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview menu__section-item-preview--sphere"
                    style={ {
                      backgroundColor: this.state.circleColor2
                    } }/>
                  }
                </div>

                {
                  this.state.isCircleColor2Toggled ?
                  <ColorSelect keyToChange='circleColor2'/>
                  : null
                }
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isCircleColor3Toggled: !prevState.isCircleColor3Toggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Colour 3

                  {
                    this.state.isCircleColor3Toggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview menu__section-item-preview--sphere"
                    style={ {
                      backgroundColor: this.state.circleColor3
                    } }/>
                  }
                </div>

                {
                  this.state.isCircleColor3Toggled ?
                  <ColorSelect keyToChange='circleColor3'/>
                  : null
                }
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isCircleAngleToggled: !prevState.isCircleAngleToggled,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  Direction

                  {
                    this.state.isCircleAngleToggled ?
                    <div className="menu__section-item-close no-circle">
                      Close
                    </div>
                    :
                    <div className="no-circle menu__section-item-preview menu__section-item-preview--sphere"
                    style={ {
                      background: `
                        linear-gradient(
                          ${ this.state.circleAngle },
                          ${ this.state.circleColor1 } ${
                            this.state.circleAngle === '0deg' || this.state.circleAngle === '180deg' ?
                              '0%' : '15%'
                          },
                          ${ this.state.backgroundColor2 } ${
                            this.state.circleAngle === '0deg' || this.state.circleAngle === '180deg' ?
                              '100%' : '85%'
                          }
                        )
                      `
                    } }/>
                  }
                </div>

                {
                  this.state.isCircleAngleToggled ?
                  <AngleSelect keyToChange='circleAngle'/>
                  : null
                }
              </div>
            </div>

            <div className="menu__section no-circle">
              <a className="menu__section-item menu__section-item--feedback no-circle"
              href="https://goo.gl/forms/eKMII00ylUf6dJ7i1"
              target="_blank"
              rel="noopener noreferrer">
                <div className="menu__section-item-title no-circle">
                  Leave feedback
                </div>
              </a>
            </div>

            <div className="menu__section menu__section--credit no-circle">
              <div className="menu__section-item no-circle">
                <div className="menu__section-item-title no-circle">
                  A thing by&nbsp;
                  <a
                  className="credit-link no-circle"
                  href="http://james.sh"
                  target="_blank"
                  rel="noopener noreferrer">
                    James Shedden
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      );
    };

    const Onboarding = () => {
      return (
        <div className="size-xxxlarge onboarding-sphere no-circle"
        style={ {
          background: 'rgba(54,30,110,0.4)',
        } }>
          <div className="onboarding-sphere__text no-circle">
            {
              !this.state.circles.length
                ? <div>
                    Click anywhere to<br/>create your first sphere
                  </div>
                : null
            }

            {
              this.state.circles.length === 1 && !this.state.isUserAfterFirstSphereMove
                ? <div>
                    <div style={ { marginBottom: '10px' } } className="no-circle">Nice!</div>
                    Try dragging your sphere to a new location.
                  </div>
                : null
            }

            {
              this.state.circles.length > 0 && this.state.circles.length < ONBOARDING_CIRCLE_AMOUNT && this.state.isUserAfterFirstSphereMove
                ? <div>
                    <div style={ { marginBottom: '10px' } } className="no-circle">Perfect.</div>
                    <div style={ { marginBottom: '10px' } } className="no-circle">Make a few more spheres — click wherever you want!</div>
                  </div>
                : null
            }

            {
              this.state.circles.length >= ONBOARDING_CIRCLE_AMOUNT
                ? <div>
                    <div style={ { marginBottom: '10px' } } className="no-circle">
                      That's all there is to it! Carry on making spheres, or open the menu for more.
                    </div>

                    <div className="onboarding-confirmation-link no-circle"
                    onClick={ () => {
                      this.setState({
                        isUserFullyOnboarded: true,
                      }, () => {
                        localStorage.setItem('spheres.isUserFullyOnboarded', true);
                      });
                    } }>
                      Ok, got it.
                    </div>
                  </div>
                : null
            }
          </div>
        </div>
      );
    }

    return (
      <div id="content" className="content"
      onMouseMove={ this.throttledMouseMove }
      // onTouchMove={ this.throttledMouseMove }
      onMouseDown={ this.onMouseDown }
      // onTouchStart={ (event) => {
      //   event.preventDefault();
      //   this.onMouseDown(event);
      // } }
      onMouseUp={ this.onMouseUp }
      onTouchEnd={ this.onMouseUp }
      style={ {
        height: '100%',
        background: `
          linear-gradient(
            ${ this.state.backgroundAngle },
            ${ this.state.backgroundColor1 } ${
              this.state.backgroundAngle === '0deg' || this.state.backgroundAngle === '180deg' ?
                '0%' : '10%'
            },
            ${ this.state.backgroundColor2 } ${
              this.state.backgroundAngle === '0deg' || this.state.backgroundAngle === '180deg' ?
                '100%' : '90%'
            }
          )
        `,
        position: 'relative',
        overflow: 'hidden',
      } }
      >

        <div className={ classNames('icons no-circle', {
          'is-menu-open': this.state.isMenuOpen,
        }) }>
          {
            !this.state.isMenuOpen &&
            (
              (
                this.state.circles.length >= ONBOARDING_CIRCLE_AMOUNT
                && !this.state.isUserFullyOnboarded
              )
              || this.state.isUserFullyOnboarded
            )
              ? <div id="open-menu-icon"
                className="icons__icon open-menu-icon no-circle"
                onClick={ this.openMenu }>
                  <MenuIcon/>
                </div>
              : null
          }

          {
            this.state.isRandomiseShortcutVisible ?
              <div className={ classNames('randomise-menu-icon icons__icon no-circle', {
                'randomise-menu-icon--is-menu-open': this.state.isMenuOpen,
              }) }
              onClick={ this.randomiseSettings }>
                <RandomiseIcon/>
              </div>
              : null
          }
        </div>

        {
          this.state.isMenuOpen ?
            <Menu/> : null
        }

        <ImagePreloader />
        {/* <div className="content__overlay" /> */}

        {
          !this.state.isUserFullyOnboarded
          ? <Onboarding/>
          : null
        }

        <CSSTransitionGroup
        transitionName="circle"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1}>
          { this.state.circles.map((circle, index) => {;
            let color;
            if (circle.colorIndex === 1) {
              color = this.state.circleColor1;
            } else if (circle.colorIndex === 2) {
              color = this.state.circleColor2;
            } else if (circle.colorIndex === 3) {
              color = this.state.circleColor3;
            }

            return (
              <div className={ circleClassNames(circle.size) }
              id={ `circle-${ circle.id }` }
              key={ circle.id }
              onMouseDown={ (event) => this.onCircleMouseDown(event, circle) }
              onTouchStart={ (event) => this.onCircleMouseDown(event, circle) }
              style={ {
                background: `
                  linear-gradient(
                    ${ this.state.circleAngle },
                    ${ color } ${
                      this.state.circleAngle === '0deg' || this.state.circleAngle === '180deg' ?
                        '0%' : '15%'
                    },
                    ${ this.state.backgroundColor2 } ${
                      this.state.circleAngle === '0deg' || this.state.circleAngle === '180deg' ?
                        '100%' : '85%'
                    }
                  )
                `,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } }>
                {/* <div style={{background: 'white', flex: '1 1 auto', fontSize: '15px', fontWeight: 'bold'}}>
                  {circle.id}
                </div> */}
              </div>
            );
          }) }
        </CSSTransitionGroup>

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 1 } />

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 2 } />

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 3 } />

      </div>
    );
  }
}

export default App;
