import React, { Component } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import Stars from './Stars';
import './App.css';

const MAX_CIRCLE_AMOUNT = 10;
let PARALLAX_AMOUNT_DIVISOR = 80;

const AVAILABLE_COLORS = {
  RED: '#FF5130',
  ORANGE: '#FEB422',
  YELLOW: '#FFDD30',
  GREEN: '#5CFF80',
  LIGHT_BLUE: '#A2FFFB',
  DARK_BLUE: '#4692FF',
  DARKER_BLUE: '#0037D0',
  DARK_PURPLE: '#370078',
  PURPLE: '#A496FF',
  PINK: '#F7A2E0',
  DARK_GREY: '#3A3A3A',
  GREY: '#B4B4B4',
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

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: AVAILABLE_COLORS.ORANGE,
      backgroundColor2: AVAILABLE_COLORS.DARK_PURPLE,
      backgroundAngle: ANGLES[45],
      circleColor1: AVAILABLE_COLORS.RED,
      circleColor2: AVAILABLE_COLORS.PURPLE,
      circleColor3: AVAILABLE_COLORS.GREEN,
      circleAngle: ANGLES[225],
      activeCircle: null,
      stars: [],
      circleElements: [],
      sphereCount: 0,
    };
  }

  componentDidMount = () => {
    window.addEventListener('resize', this.throttledWindowResize); // TODO: remove event listener on unmount

    window.addEventListener('deviceorientation', this.throttledDeviceOrientation); // TODO: remove event listener on unmount

    window.addEventListener('touchstart', () => {
      // the higher this is, the less we see any parallax effects — this
      // effectively turns parallax off if the user is interacting via
      // touch events
      // PARALLAX_AMOUNT_DIVISOR = 5000;
      this.setState({
        isTouchUser: true,
      });
    });

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
    });
  }

  componentDidUpdate() {
    if (this.state.isMenuOpen && this.state.menuContentsScrollPosition) {
      document.getElementById('menu-content').scrollTop = this.state.menuContentsScrollPosition;
    }
  }

  throttledDeviceOrientation = (event) => {
    _.throttle(_.partial(this.onDeviceOrientation, event), 10)();
  }

  onDeviceOrientation = (event) => {
    if (this.state.circleElements.length && this.state.isTouchUser) {
      let x = event.beta;
      let y = event.gamma;

      // Because we don't want to have the device upside down
      // We constrain the x value to the range [-90,90]
      if (x >  90) { x =  90};
      if (x < -90) { x = -90};

      this.setState({
        deviceOrientationBeta: x,
        deviceOrientationGamma: y,
      });

      this.transformCirclesWithOrientation(this.state.circleElements, y, x);
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

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, parallaxDivisor) => {
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these
    const MULTIPLIER_BUFFER = 2;

    const multiplier = multiplierFromZero + MULTIPLIER_BUFFER

    let translateX;
    let translateY;

    // for now we want to set the divisor to null whenever we detect the movement
    // is coming from a touch event, as parallax currently doesn't work on
    // tablets/phones so we don't want to account for the parallax divisor
    //
    // therefore we have a case for when it's falsy
    if (PARALLAX_AMOUNT_DIVISOR !== 0) {
      translateX = (coordinates.x * (multiplier)) / parallaxDivisor;
      translateY = (coordinates.y * (multiplier)) / parallaxDivisor;
    } else {
      translateX = coordinates.x;
      translateY = coordinates.y;
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
      event = event.nativeEvent;
    } else {
      event.persist();
    }

    let { pageX, pageY } = event;

    // calculating the position of the sphere in the stack
    // if we haven't hit the total number of spheres yet, we can just use the
    // latest sphere count.
    //
    // if now, we can take the total amount and minus 1 (essentially means the
    // newest sphere always has the maximum possible index/multiplier)
    const multiplierForTranslateAmounts = this.state.sphereCount > MAX_CIRCLE_AMOUNT ?
      MAX_CIRCLE_AMOUNT - 1 : this.state.sphereCount;

    // Based on where we clicked to make the circle, we need to figure out
    // how much of its position should be affected by transform amounts
    //
    // distance = top & left position + translateX & translateY based on
    // cursor position.
    //
    // so we take the cursor's position, the 'multiplier' i.e. the index of the
    // sphere & the parallax 'amount' to figure out how much of its position
    // should come from transforms.
    //

    if (this.state.isTouchUser) {
      pageX = this.state.deviceOrientationGamma*3;
      pageY = this.state.deviceOrientationBeta*3;
    }

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      // TODO: DEVICE ORIENTATION
      // for device orientation, we don't care about pointer coordinates — we care about
      // the gamma & beta values, which represent the altered 'viewpoint' on the x & y axis,
      // in the same way the pointer coordinates normally represent the 'viewpoint' on
      // desktop
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR,
    );

    // get random 'color index' — this can refer to color 1, 2 and 3 — the colours
    // could be subject to change, but spheres should remember which number
    // they are.
    let colorIndex = this.randomNumber(1, 3);

    // random size
    let size = SIZES[this.randomNumber(0, SIZES.length)];

    // cache circles
    let circles = this.state.circles;

    // now we can set the top & left positions as the place where we clicked,
    // minus the amounts we know should come from translations
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
    });
  };

  returnTransformValuesAsNumbers = (values) => {
    let numbers = values.match(/\(.*?\)/g);

    return {
      translateX: parseFloat(numbers[0].replace(/[^0-9|.|-]/g, '')),
      translateY: parseFloat(numbers[1].replace(/[^0-9|.|-]/g, '')),
    }
  }

  transformCircles = (circles, x, y) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x, y),
        index,
        PARALLAX_AMOUNT_DIVISOR,
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  transformCirclesWithOrientation = (circles, x, y) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x*3, y*3),
        index,
        PARALLAX_AMOUNT_DIVISOR,
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
    if (event.type === 'touchend') {
      event = event.nativeEvent;
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
    event.persist();

    const { pageX, pageY } = event;

    // This shouldn't get called when user isTouchUser, but
    // still seems to get triggered in some situations e.g. opening the menu
    if (this.state.circleElements.length && !this.state.isTouchUser) {
      this.transformCircles(this.state.circleElements, pageX, pageY);
    }

    if (this.state.activeCircle) {
      this.moveActiveCircle(this.state.activeCircle.element, pageX, pageY);
    }
  }

  onTouchMove = (event) => {
    event = event.nativeEvent;

    const { pageX, pageY } = event;

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

  throttledTouchMove = (event) => {
    _.throttle(this.onTouchMove.bind(this, event), 20)();
  }

  onMouseUp = (event) => {
    if (!_.includes(event.target.classList, 'no-circle')) {
      if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
        this.transformActiveCircle(event);
        this.state.activeCircle.element.classList.remove('is-active');
        this.setState({ activeCircle: null });
      } else {
        this.makeCircle(event);
        this.setState({ activeCircle: null });
      };
    }
  }

  onCircleMouseDown = (event, circle) => {
    if (event.type === 'touchend' || event.type === 'touchstart') {
      event = event.nativeEvent;
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
    });
  }

  openMenu = () => {
    this.setState(
      (prevState) => {
        return {
          isMenuOpen: !this.state.isMenuOpen,
        };
      }
    );
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
          background: `
            url('/dots-texture-dark-transparent.png'),
            url('/dots-texture-light.jpg')
          `
        } }>
          <img src="/menu-icon.svg"/>
          <img src="/close-icon.svg"/>
          <img src="/tick-icon.svg"/>
          <img src="/randomise-icon.svg"/>
        </div>
      );
    }

    const ColorSelect = ({ keyToChange }) => {
      return (
        <div className='color-select'>
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
                  });
                } }>
                  <img className="color-select__active-icon" src="/tick-icon.svg"/>
                </div>
              );
            })
          }
        </div>
      );
    }

    const AngleSelect = ({ keyToChange }) => {
      return (
        <div className="angle-select">
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
                  });
                } }>
                  <img className="angle-select__active-icon" src="/tick-icon.svg"/>
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

          <div className="menu__mobile-spacer no-circle"></div>

          <div className="menu__content no-circle" id="menu-content">
            {
              this.state.isMenuOpen ?
              <div className="close-menu-icon no-circle"
              onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isMenuOpen: !this.state.isMenuOpen,
                  };
                })
              } }>
                <img src="/close-icon.svg"
                className="close-menu-icon__desktop-image no-circle"
                />
                <img src="/close-icon-mobile.svg"
                className="close-menu-icon__mobile-image no-circle"
                />
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
                className="menu__section-item-title no-circle">
                  Randomise!
                </div>
              </div>

              <div className="menu__section-item no-circle">
                <div onClick={ () => {
                  this.setState((prevState) => {
                    return {
                      isRandomiseShortcutVisible: !prevState.isRandomiseShortcutVisible,
                      menuContentsScrollPosition: document.getElementById('menu-content').scrollTop,
                    };
                  });
                } }
                className="menu__section-item-title no-circle">
                  { this.state.isRandomiseShortcutVisible ? 'Hide' : 'Show' } randomise shortcut
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

          </div>
        </div>
      );
    };

    return (
      <div id="content" className="content"
      onMouseMove={ this.throttledMouseMove }
      onTouchMove={ this.throttledTouchMove }
      onMouseDown={ this.onMouseDown }
      onTouchStart={ this.onMouseDown }
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
        {
          !this.state.isMenuOpen ?
          <div className="open-menu-icon no-circle"
          style={ {
            zIndex: 9999, display: 'inline-block', position: 'absolute', top: 15, left: 15,
          }}
          onClick={ this.openMenu }>
            <img src="/menu-icon.svg"
            className="no-circle"
            />
          </div>
          : null
        }

        {
          this.state.isRandomiseShortcutVisible ?
          <div className={ classNames('randomise-menu-icon no-circle', {
            'randomise-menu-icon--is-menu-open': this.state.isMenuOpen,
          }) }
          onClick={ this.randomiseSettings }>
            <img src="/randomise-icon.svg"
            className="no-circle"
            />
          </div>
          : null
        }

        {
          this.state.isMenuOpen ?
            <Menu/> : null
        }

        <ImagePreloader />
        {/* <div className="content__overlay" /> */}

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
